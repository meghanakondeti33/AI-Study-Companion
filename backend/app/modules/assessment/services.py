import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.projects.models import Project
from app.modules.materials.models import Material, MaterialStatus, MaterialChunk
from app.modules.assessment.models import Quiz, QuizQuestion, QuizAttempt, QuizAnswer
from app.modules.assessment.schemas import (
    QuizCreateRequest,
    QuizGenerationAIResponse,
    OpenEndedEvaluation,
)
from app.modules.assessment.prompts import (
    build_quiz_generation_prompt,
    build_evaluation_prompt,
)
from app.modules.retrieval.services import get_retrieval_service, RetrievalService, RetrievedChunk
from app.modules.ai.llm import get_llm_service, LLMService, LLMServiceError
from app.modules.ai.models import record_ai_telemetry
from app.modules.events.models import emit_learning_event

logger = logging.getLogger(__name__)


class QuizService:
    """Service handling grounded quiz generation, deterministic MCQ grading, and AI open-ended evaluation."""

    def __init__(
        self,
        retrieval_service: Optional[RetrievalService] = None,
        llm_service: Optional[LLMService] = None,
    ):
        self.retrieval = retrieval_service or get_retrieval_service()
        self.llm = llm_service or get_llm_service()

    def generate_quiz(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        request: QuizCreateRequest,
    ) -> Quiz:
        """
        Generate an adaptive, grounded quiz:
        1. Verify project ownership.
        2. Verify project contains READY materials.
        3. Retrieve project chunks.
        4. Extract previous mistakes for adaptivity.
        5. Invoke LLM to generate questions adhering to schema.
        6. Validate citations and prevent hallucinated pages.
        7. Persist Quiz and Questions.
        8. Emit 'quiz_created' learning event and record AI telemetry.
        """
        # 1. Verify project ownership
        project = (
            db.query(Project)
            .filter(Project.id == project_id, Project.user_id == user_id)
            .first()
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # 2. Verify project contains READY materials
        ready_materials = (
            db.query(Material)
            .filter(
                Material.project_id == project_id,
                Material.status == MaterialStatus.READY,
            )
            .all()
        )
        if not ready_materials:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project has no processed materials ready for quiz generation. Please upload and process a document first.",
            )

        # 3. Retrieve relevant project chunks
        retrieved_chunks = self.retrieval.search_project_chunks(
            db=db,
            project_id=project_id,
            query="core concepts key definitions principles and fundamentals",
            top_k=8,
            similarity_threshold=0.10,
        )

        # Fallback: if similarity filter returned nothing, fetch available chunks directly
        if not retrieved_chunks:
            db_chunks = (
                db.query(MaterialChunk)
                .filter(MaterialChunk.project_id == project_id)
                .order_by(MaterialChunk.page_number.asc(), MaterialChunk.chunk_index.asc())
                .limit(8)
                .all()
            )
            retrieved_chunks = [
                RetrievedChunk(
                    id=c.id,
                    material_id=c.material_id,
                    project_id=c.project_id,
                    page_number=c.page_number,
                    chunk_index=c.chunk_index,
                    content=c.content,
                    similarity=1.0,
                )
                for c in db_chunks
            ]

        if not retrieved_chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No content chunks found in project materials to generate questions from.",
            )

        # Build valid page map to prevent hallucinated citations
        valid_pages = {c.page_number for c in retrieved_chunks}
        page_to_material_id = {c.page_number: c.material_id for c in retrieved_chunks}
        default_page = retrieved_chunks[0].page_number
        default_mat_id = retrieved_chunks[0].material_id

        # 4. Adaptivity: Extract previous mistakes for this user in this project
        failed_answers = (
            db.query(QuizAnswer)
            .join(QuizAttempt, QuizAnswer.attempt_id == QuizAttempt.id)
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .filter(
                Quiz.project_id == project_id,
                QuizAttempt.user_id == user_id,
                QuizAnswer.is_correct == False,
            )
            .order_by(QuizAnswer.created_at.desc())
            .limit(5)
            .all()
        )

        weaknesses = []
        for ans in failed_answers:
            if ans.question:
                weaknesses.append({
                    "question_text": ans.question.question_text,
                    "concept": ans.question.explanation,
                    "difficulty": ans.question.difficulty,
                })

        # 5. Call LLM for generation
        difficulty = request.difficulty or "medium"
        num_questions = request.num_questions or 4
        messages = build_quiz_generation_prompt(
            chunks=retrieved_chunks,
            num_questions=num_questions,
            difficulty=difficulty,
            weaknesses=weaknesses,
        )

        generated_data: Optional[QuizGenerationAIResponse] = None
        attempt_count = 0
        max_retries = 2
        last_error = None

        while attempt_count < max_retries:
            attempt_count += 1
            try:
                content, usage, latency_ms = self.llm.generate_chat_completion(
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                )

                record_ai_telemetry(
                    db=db,
                    user_id=user_id,
                    feature="quiz_generation",
                    model=self.llm.model,
                    latency_ms=latency_ms,
                    prompt_tokens=usage.get("prompt_tokens", 0),
                    completion_tokens=usage.get("completion_tokens", 0),
                    status="success",
                    project_id=project_id,
                    retrieval_chunks_count=len(retrieved_chunks),
                )

                # Robust JSON extraction
                clean_content = content.strip()
                if clean_content.startswith("```json"):
                    clean_content = clean_content[7:]
                elif clean_content.startswith("```"):
                    clean_content = clean_content[3:]
                if clean_content.endswith("```"):
                    clean_content = clean_content[:-3]
                clean_content = clean_content.strip()

                parsed_json = json.loads(clean_content)
                if isinstance(parsed_json, list):
                    parsed_json = {"questions": parsed_json}
                elif isinstance(parsed_json, dict) and "questions" not in parsed_json and "quiz" in parsed_json:
                    parsed_json = {"questions": parsed_json["quiz"]}

                generated_data = QuizGenerationAIResponse.model_validate(parsed_json)
                if generated_data.questions:
                    break
            except LLMServiceError as lse:
                logger.warning("Quiz generation attempt %d failed with LLM error: %s", attempt_count, lse)
                last_error = lse
                if attempt_count >= max_retries:
                    record_ai_telemetry(
                        db=db,
                        user_id=user_id,
                        feature="quiz_generation",
                        model=self.llm.model,
                        latency_ms=0,
                        status="error",
                        error_message=str(lse),
                        project_id=project_id,
                        retrieval_chunks_count=len(retrieved_chunks),
                    )
                    raise HTTPException(
                        status_code=lse.status_code,
                        detail=f"Failed to generate quiz from AI service: {lse.message}",
                    )
            except Exception as e:
                logger.warning("Quiz generation attempt %d failed with exception: %s", attempt_count, e)
                last_error = e
                if attempt_count >= max_retries:
                    record_ai_telemetry(
                        db=db,
                        user_id=user_id,
                        feature="quiz_generation",
                        model=self.llm.model,
                        latency_ms=0,
                        status="error",
                        error_message=str(e),
                        project_id=project_id,
                        retrieval_chunks_count=len(retrieved_chunks),
                    )
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to generate quiz from AI service: {e}",
                    )

        if not generated_data or not generated_data.questions:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to generate quiz from AI service: AI service returned an empty or malformed quiz structure.",
            )

        # 6. Create Quiz & QuizQuestion records with grounded citations
        quiz_title = request.title or f"{project.name} - Adaptive Quiz ({difficulty.capitalize()})"
        quiz = Quiz(
            project_id=project_id,
            user_id=user_id,
            title=quiz_title,
            status="READY",
        )
        db.add(quiz)
        db.flush()

        for item in generated_data.questions:
            # Enforce strictly grounded page citations
            cited_page = item.page_number if item.page_number in valid_pages else default_page
            mat_id = page_to_material_id.get(cited_page, default_mat_id)
            citations = [{"material_id": mat_id, "page_number": cited_page}]

            # Sanitize MCQ options & answer
            clean_options = item.options
            clean_correct_answer = item.correct_answer.strip()
            if item.question_type == "mcq":
                if not clean_options or len(clean_options) < 2:
                    # Fallback to ensure at least valid MCQ options
                    clean_options = [clean_correct_answer, "Option B", "Option C", "Option D"]
                if clean_correct_answer not in clean_options:
                    clean_options[0] = clean_correct_answer

            question = QuizQuestion(
                quiz_id=quiz.id,
                question_type=item.question_type,
                question_text=item.question_text.strip(),
                options=clean_options if item.question_type == "mcq" else None,
                correct_answer=clean_correct_answer,
                explanation=item.explanation.strip(),
                source_citations=citations,
                difficulty=item.difficulty or difficulty,
            )
            db.add(question)

        db.flush()

        # 7. Emit 'quiz_created' learning event
        emit_learning_event(
            db=db,
            user_id=user_id,
            project_id=project_id,
            event_type="quiz_created",
            event_data={
                "quiz_id": quiz.id,
                "question_count": len(generated_data.questions),
                "difficulty": difficulty,
                "adapted_from_weaknesses_count": len(weaknesses),
            },
        )
        db.commit()
        db.refresh(quiz)
        return quiz

    def list_project_quizzes(
        self,
        db: Session,
        project_id: str,
        user_id: str,
    ) -> List[Quiz]:
        """List all quizzes for a user's project."""
        project = (
            db.query(Project)
            .filter(Project.id == project_id, Project.user_id == user_id)
            .first()
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        return (
            db.query(Quiz)
            .filter(Quiz.project_id == project_id, Quiz.user_id == user_id)
            .order_by(Quiz.created_at.desc())
            .all()
        )

    def get_quiz(
        self,
        db: Session,
        quiz_id: str,
        user_id: str,
    ) -> Quiz:
        """Fetch quiz details with strict user isolation."""
        quiz = (
            db.query(Quiz)
            .filter(Quiz.id == quiz_id, Quiz.user_id == user_id)
            .first()
        )
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found",
            )
        return quiz

    def start_attempt(
        self,
        db: Session,
        quiz_id: str,
        user_id: str,
    ) -> QuizAttempt:
        """Start a new attempt for a quiz."""
        quiz = self.get_quiz(db=db, quiz_id=quiz_id, user_id=user_id)

        attempt = QuizAttempt(
            quiz_id=quiz.id,
            user_id=user_id,
            started_at=datetime.now(timezone.utc),
        )
        db.add(attempt)
        db.flush()

        emit_learning_event(
            db=db,
            user_id=user_id,
            project_id=quiz.project_id,
            event_type="quiz_attempted",
            event_data={
                "quiz_id": quiz.id,
                "attempt_id": attempt.id,
            },
        )
        db.commit()
        db.refresh(attempt)
        return attempt

    def submit_answer(
        self,
        db: Session,
        attempt_id: str,
        user_id: str,
        question_id: str,
        answer_text: str,
    ) -> QuizAnswer:
        """
        Submit an answer for an active attempt:
        - Checks ownership and completion state.
        - Prevents duplicate answer submissions.
        - Deterministically evaluates MCQs without LLM.
        - Evaluates open-ended questions using LLM with supporting chunks.
        """
        attempt = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id)
            .first()
        )
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attempt not found",
            )

        if attempt.completed_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quiz attempt has already been completed.",
            )

        # Prevent duplicate answer
        existing_answer = (
            db.query(QuizAnswer)
            .filter(
                QuizAnswer.attempt_id == attempt_id,
                QuizAnswer.question_id == question_id,
            )
            .first()
        )
        if existing_answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An answer has already been submitted for this question in this attempt.",
            )

        question = (
            db.query(QuizQuestion)
            .filter(
                QuizQuestion.id == question_id,
                QuizQuestion.quiz_id == attempt.quiz_id,
            )
            .first()
        )
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found in this quiz.",
            )

        clean_input = answer_text.strip()

        # MCQ Evaluation (Deterministic, no LLM)
        if question.question_type == "mcq":
            is_correct = clean_input.lower() == question.correct_answer.strip().lower()
            score = 1.0 if is_correct else 0.0
            feedback = (
                f"Correct! {question.explanation}"
                if is_correct
                else f"Incorrect. The correct answer is: '{question.correct_answer}'. {question.explanation}"
            )

            answer = QuizAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                answer_text=clean_input,
                is_correct=is_correct,
                score=score,
                feedback=feedback,
                evaluated_by="system",
                evaluation_details=None,
            )
            db.add(answer)
            db.commit()
            db.refresh(answer)
            return answer

        # Open-Ended Evaluation (AI Evaluator)
        supporting_chunks = self.retrieval.search_project_chunks(
            db=db,
            project_id=attempt.quiz.project_id,
            query=f"{question.question_text} {question.correct_answer}",
            top_k=3,
            similarity_threshold=0.15,
        )

        eval_messages = build_evaluation_prompt(
            question_text=question.question_text,
            rubric=question.correct_answer,
            learner_answer=clean_input,
            supporting_chunks=supporting_chunks,
        )

        eval_data: Optional[OpenEndedEvaluation] = None
        attempt_count = 0
        max_retries = 2

        while attempt_count < max_retries:
            attempt_count += 1
            try:
                content, usage, latency_ms = self.llm.generate_chat_completion(
                    messages=eval_messages,
                    response_format={"type": "json_object"},
                    temperature=0.1,
                )

                record_ai_telemetry(
                    db=db,
                    user_id=user_id,
                    feature="quiz_evaluation",
                    model=self.llm.model,
                    latency_ms=latency_ms,
                    prompt_tokens=usage.get("prompt_tokens", 0),
                    completion_tokens=usage.get("completion_tokens", 0),
                    status="success",
                    project_id=attempt.quiz.project_id,
                    retrieval_chunks_count=len(supporting_chunks),
                )

                clean_eval_content = content.strip()
                if clean_eval_content.startswith("```json"):
                    clean_eval_content = clean_eval_content[7:]
                elif clean_eval_content.startswith("```"):
                    clean_eval_content = clean_eval_content[3:]
                if clean_eval_content.endswith("```"):
                    clean_eval_content = clean_eval_content[:-3]
                clean_eval_content = clean_eval_content.strip()

                parsed = json.loads(clean_eval_content)
                eval_data = OpenEndedEvaluation.model_validate(parsed)
                break
            except Exception as e:
                logger.warning("Evaluation attempt %d failed: %s", attempt_count, e)
                if attempt_count >= max_retries:
                    record_ai_telemetry(
                        db=db,
                        user_id=user_id,
                        feature="quiz_evaluation",
                        model=self.llm.model,
                        latency_ms=0,
                        status="error",
                        error_message=str(e),
                        project_id=attempt.quiz.project_id,
                        retrieval_chunks_count=len(supporting_chunks),
                    )
                    # Safe graceful fallback evaluation
                    eval_data = OpenEndedEvaluation(
                        score=0.5,
                        is_correct=False,
                        feedback="Your response was recorded. Automatic detailed AI evaluation was temporarily unavailable.",
                        strengths=[],
                        gaps=["Could not automatically evaluate against rubric at this time."],
                        improvement_hint="Review the question explanation and supporting material.",
                    )

        answer = QuizAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_text=clean_input,
            is_correct=eval_data.is_correct,
            score=eval_data.score,
            feedback=eval_data.feedback,
            evaluation_details={
                "strengths": eval_data.strengths,
                "gaps": eval_data.gaps,
                "improvement_hint": eval_data.improvement_hint,
            },
            evaluated_by="ai",
        )
        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer

    def complete_attempt(
        self,
        db: Session,
        attempt_id: str,
        user_id: str,
    ) -> QuizAttempt:
        """Complete an attempt, compute final percentage score, and emit 'quiz_completed'."""
        attempt = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id)
            .first()
        )
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attempt not found",
            )

        if attempt.completed_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quiz attempt has already been completed.",
            )

        answers = (
            db.query(QuizAnswer)
            .filter(QuizAnswer.attempt_id == attempt_id)
            .all()
        )
        total_questions = len(attempt.quiz.questions)
        total_score_sum = sum(ans.score or 0.0 for ans in answers)
        final_percentage = (
            round((total_score_sum / total_questions) * 100.0, 1)
            if total_questions > 0
            else 0.0
        )

        completed_time = datetime.now(timezone.utc)
        attempt.score = final_percentage
        attempt.completed_at = completed_time


        # If quiz doesn't have completed_at yet, set it
        if not attempt.quiz.completed_at:
            attempt.quiz.completed_at = completed_time

        db.flush()

        emit_learning_event(
            db=db,
            user_id=user_id,
            project_id=attempt.quiz.project_id,
            event_type="quiz_completed",
            event_data={
                "quiz_id": attempt.quiz_id,
                "attempt_id": attempt.id,
                "question_count": total_questions,
                "answers_count": len(answers),
                "score": final_percentage,
            },
        )

        # Update Concept Mastery deterministically from quiz performance
        try:
            from app.modules.mastery.services import get_mastery_service
            get_mastery_service().process_quiz_completion(
                db=db,
                attempt_id=attempt.id,
                user_id=user_id,
            )
        except Exception as e:
            logger.warning("Failed to update concept mastery on quiz completion: %s", e)

        db.commit()
        db.refresh(attempt)
        return attempt


_quiz_service: Optional[QuizService] = None


def get_quiz_service() -> QuizService:
    global _quiz_service
    if _quiz_service is None:
        _quiz_service = QuizService()
    return _quiz_service
