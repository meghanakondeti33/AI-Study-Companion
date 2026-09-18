import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.projects.models import Project
from app.modules.materials.models import MaterialChunk
from app.modules.assessment.models import QuizAttempt, QuizAnswer, QuizQuestion
from app.modules.mastery.models import Concept, ConceptMastery, MasteryHistory
from app.modules.mastery.schemas import (
    ConceptExtractionResponse,
    TutorEvidenceSignal,
)
from app.modules.mastery.prompts import (
    CONCEPT_EXTRACTION_SYSTEM_PROMPT,
    CONCEPT_EXTRACTION_USER_PROMPT,
    TUTOR_EVIDENCE_SYSTEM_PROMPT,
    TUTOR_EVIDENCE_USER_PROMPT,
)
from app.modules.ai.llm import get_llm_service, LLMService, LLMServiceError
from app.modules.ai.models import record_ai_telemetry
from app.modules.events.models import emit_learning_event

logger = logging.getLogger(__name__)


class MasteryService:
    """
    Deterministic Concept Mastery Calculation & Tracking Service.
    LLM never directly writes mastery scores. All calculations are strictly
    computed by application logic.
    """

    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm = llm_service or get_llm_service()

    @staticmethod
    def calculate_new_mastery(old_score: Optional[float], evidence_score: float) -> float:
        """
        Deterministic formula:
          new_score = old_score * 0.7 + evidence_score * 0.3
        If old_score is None, the initial mastery score is the evidence score.
        Clamped strictly between 0.0 and 100.0, rounded to 1 decimal place.

        Example:
          old = 50, evidence = 80 -> 50 * 0.7 + 80 * 0.3 = 35 + 24 = 59.0
        """
        # Ensure evidence score is normalized to 0.0 - 100.0
        norm_evidence = float(evidence_score)
        if norm_evidence < 0.0:
            norm_evidence = 0.0
        elif norm_evidence > 100.0:
            norm_evidence = 100.0

        if old_score is None:
            raw_score = norm_evidence
        else:
            raw_old = float(old_score)
            raw_score = raw_old * 0.7 + norm_evidence * 0.3

        clamped = max(0.0, min(100.0, raw_score))
        return round(clamped, 1)

    def extract_project_concepts(
        self,
        db: Session,
        project_id: str,
        user_id: Optional[str] = None,
    ) -> List[Concept]:
        """
        Extract concise, grounded learning concepts for a project from its material chunks.
        Deduplicates concepts by name and persists them to the database.
        """
        # 1. Verify project exists
        project_query = db.query(Project).filter(Project.id == project_id)
        if user_id:
            project_query = project_query.filter(Project.user_id == user_id)
        project = project_query.first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # 2. Fetch project chunks
        chunks = (
            db.query(MaterialChunk)
            .filter(MaterialChunk.project_id == project_id)
            .order_by(MaterialChunk.page_number.asc(), MaterialChunk.chunk_index.asc())
            .limit(12)
            .all()
        )
        if not chunks:
            logger.info("No material chunks found for project %s to extract concepts from", project_id)
            return db.query(Concept).filter(Concept.project_id == project_id).all()

        # 3. Assemble excerpts
        excerpts = []
        for c in chunks:
            excerpts.append(f"[Page {c.page_number}]: {c.content[:400]}")
        material_text = "\n\n".join(excerpts)

        # 4. Invoke LLM for structured concept extraction
        messages = [
            {"role": "system", "content": CONCEPT_EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": CONCEPT_EXTRACTION_USER_PROMPT.format(material_text=material_text)},
        ]

        extracted_response: Optional[ConceptExtractionResponse] = None
        try:
            content, usage, latency_ms = self.llm.generate_chat_completion(
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,
            )

            record_ai_telemetry(
                db=db,
                user_id=project.user_id,
                feature="concept_extraction",
                model=self.llm.model,
                latency_ms=latency_ms,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                status="success",
                project_id=project_id,
                retrieval_chunks_count=len(chunks),
            )

            parsed = json.loads(content)
            # Support either {"concepts": [...]} or raw array
            if isinstance(parsed, list):
                extracted_response = ConceptExtractionResponse(concepts=parsed)
            else:
                extracted_response = ConceptExtractionResponse.model_validate(parsed)

        except Exception as e:
            logger.warning("Concept extraction LLM call failed for project %s: %s", project_id, e)
            record_ai_telemetry(
                db=db,
                user_id=project.user_id,
                feature="concept_extraction",
                model=self.llm.model,
                latency_ms=0,
                status="error",
                error_message=str(e),
                project_id=project_id,
                retrieval_chunks_count=len(chunks),
            )
            # Safe fallback: extract simple topic names from project name or existing concepts
            return db.query(Concept).filter(Concept.project_id == project_id).all()

        if not extracted_response or not extracted_response.concepts:
            return db.query(Concept).filter(Concept.project_id == project_id).all()

        # 5. Persist concepts with deduplication
        created_concepts: List[Concept] = []
        for item in extracted_response.concepts:
            clean_name = item.name.strip()
            if not clean_name:
                continue

            # Case-insensitive duplicate check for this project
            existing = (
                db.query(Concept)
                .filter(
                    Concept.project_id == project_id,
                    func.lower(Concept.name) == clean_name.lower(),
                )
                .first()
            )
            if existing:
                continue

            concept = Concept(
                project_id=project_id,
                name=clean_name,
                description=item.description.strip(),
            )
            db.add(concept)
            created_concepts.append(concept)

        db.commit()
        for c in created_concepts:
            db.refresh(c)

        return (
            db.query(Concept)
            .filter(Concept.project_id == project_id)
            .order_by(Concept.name.asc())
            .all()
        )

    def record_concept_evidence(
        self,
        db: Session,
        user_id: str,
        project_id: str,
        concept_id: str,
        evidence_score: float,
        source: str,
        evidence_id: Optional[str] = None,
        evidence_details: Optional[Dict[str, Any]] = None,
    ) -> ConceptMastery:
        """
        Deterministically update ConceptMastery and create an immutable MasteryHistory record.
        Strictly idempotent: if evidence_id is already recorded in history, returns existing mastery.
        """
        # 1. Idempotency check
        if evidence_id:
            existing_history = (
                db.query(MasteryHistory)
                .filter(
                    MasteryHistory.user_id == user_id,
                    MasteryHistory.concept_id == concept_id,
                    MasteryHistory.evidence_id == evidence_id,
                )
                .first()
            )
            if existing_history:
                logger.info("Skipping duplicate mastery update for evidence_id=%s", evidence_id)
                mastery = (
                    db.query(ConceptMastery)
                    .filter_by(user_id=user_id, concept_id=concept_id)
                    .first()
                )
                return mastery

        # 2. Look up existing mastery
        mastery = (
            db.query(ConceptMastery)
            .filter(
                ConceptMastery.user_id == user_id,
                ConceptMastery.concept_id == concept_id,
            )
            .first()
        )

        previous_score = mastery.mastery_score if mastery else 0.0
        old_score_arg = mastery.mastery_score if mastery else None
        new_score = self.calculate_new_mastery(old_score=old_score_arg, evidence_score=evidence_score)

        now = datetime.now(timezone.utc)

        # 3. Update or create ConceptMastery
        if not mastery:
            mastery = ConceptMastery(
                user_id=user_id,
                project_id=project_id,
                concept_id=concept_id,
                mastery_score=new_score,
                last_assessed_at=now,
            )
            db.add(mastery)
        else:
            mastery.mastery_score = new_score
            mastery.last_assessed_at = now

        db.flush()

        # 4. Record immutable MasteryHistory
        history = MasteryHistory(
            user_id=user_id,
            project_id=project_id,
            concept_id=concept_id,
            previous_score=previous_score,
            new_score=new_score,
            source=source,
            evidence_id=evidence_id,
            evidence_details=evidence_details,
            created_at=now,
        )
        db.add(history)
        db.flush()

        # 5. Emit mastery_updated learning event
        emit_learning_event(
            db=db,
            user_id=user_id,
            project_id=project_id,
            event_type="mastery_updated",
            event_data={
                "user_id": user_id,
                "project_id": project_id,
                "concept_id": concept_id,
                "previous_score": previous_score,
                "new_score": new_score,
                "source": source,
                "evidence_id": evidence_id,
            },
        )
        db.commit()
        db.refresh(mastery)

        # 6. Trigger Growth Classification and Recommendations update
        try:
            from app.modules.growth.services import get_growth_service
            get_growth_service().compute_project_growth(
                db=db,
                project_id=project_id,
                user_id=user_id,
            )
        except Exception as exc:
            logger.warning("Failed to compute growth snapshot after mastery update: %s", exc)

        return mastery

    def process_quiz_completion(
        self,
        db: Session,
        attempt_id: str,
        user_id: str,
    ) -> List[ConceptMastery]:
        """
        Process completed quiz attempt:
        1. Find concepts represented by quiz questions.
        2. Compute performance evidence per concept.
        3. Deterministically update ConceptMastery and MasteryHistory.
        4. Emit mastery_updated events.
        """
        attempt = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id)
            .first()
        )
        if not attempt or not attempt.quiz:
            return []

        project_id = attempt.quiz.project_id

        # 1. Fetch available concepts for project
        concepts = db.query(Concept).filter(Concept.project_id == project_id).all()
        if not concepts:
            # Try auto-extracting concepts if none exist yet
            try:
                concepts = self.extract_project_concepts(db=db, project_id=project_id, user_id=user_id)
            except Exception as e:
                logger.warning("Could not auto-extract concepts during quiz completion: %s", e)

        if not concepts:
            logger.info("No concepts available in project %s to map quiz results to", project_id)
            return []

        # 2. Map questions to concepts
        answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == attempt_id).all()
        if not answers:
            return []

        # Group answers by concept
        concept_scores: Dict[str, List[float]] = {c.id: [] for c in concepts}
        matched_any = False

        for ans in answers:
            q = ans.question
            if not q:
                continue

            # Convert answer performance into evidence score (0 - 100)
            if q.question_type == "mcq":
                score_pct = 100.0 if ans.is_correct else 0.0
            else:
                raw_score = ans.score if ans.score is not None else (1.0 if ans.is_correct else 0.0)
                score_pct = raw_score * 100.0

            # Match question to best concept by keyword in text or explanation
            q_text_lower = f"{q.question_text} {q.explanation}".lower()
            matched_concept = None
            for c in concepts:
                c_name_lower = c.name.lower()
                if c_name_lower in q_text_lower:
                    matched_concept = c
                    break

            if matched_concept:
                concept_scores[matched_concept.id].append(score_pct)
                matched_any = True
            else:
                # If no direct keyword match, map to closest concept by shared words
                best_concept = None
                max_overlap = 0
                for c in concepts:
                    overlap = sum(1 for word in c.name.lower().split() if word in q_text_lower)
                    if overlap > max_overlap:
                        max_overlap = overlap
                        best_concept = c
                        
                if best_concept and max_overlap > 0:
                    concept_scores[best_concept.id].append(score_pct)
                    matched_any = True
                else:
                    logger.info("Question '%s' could not be mapped to any concept. Dropping mastery update for this question.", q.id)

        # 3. Update mastery for each concept represented
        updated_masteries: List[ConceptMastery] = []
        for concept in concepts:
            scores = concept_scores.get(concept.id, [])
            if not scores:
                continue

            avg_evidence = sum(scores) / len(scores)
            evidence_id = f"attempt_{attempt.id}_concept_{concept.id}"

            # Determine primary source
            has_open_ended = any(
                ans.question and ans.question.question_type == "open_ended"
                for ans in answers
            )
            source = "open_ended" if has_open_ended and len(scores) == 1 else "quiz"

            mastery = self.record_concept_evidence(
                db=db,
                user_id=user_id,
                project_id=project_id,
                concept_id=concept.id,
                evidence_score=avg_evidence,
                source=source,
                evidence_id=evidence_id,
                evidence_details={
                    "quiz_id": attempt.quiz_id,
                    "attempt_id": attempt.id,
                    "questions_tested": len(scores),
                    "concept_name": concept.name,
                },
            )
            updated_masteries.append(mastery)

        return updated_masteries

    def process_tutor_interaction(
        self,
        db: Session,
        user_id: str,
        project_id: str,
        user_message_id: str,
        user_message: str,
        tutor_response: str,
        is_grounded: bool,
    ) -> Optional[ConceptMastery]:
        """
        Evaluate a tutor exchange for learning evidence.
        Applies conservative filters:
        - Non-grounded or refusal responses are ignored.
        - Short greetings or basic questions are ignored.
        - Idempotent on user_message_id.
        - Structured AI classification with high threshold (score >= 0.60).
        """
        # 1. Conservative preliminary heuristics
        if not is_grounded:
            return None

        clean_user_msg = user_message.strip()
        if len(clean_user_msg) < 15:
            return None

        # Simple passive inquiry keywords that do not demonstrate mastery
        passive_starts = ("what is", "what are", "can you explain", "explain to me", "help me understand", "tell me about", "who is", "why is", "how do I")
        if clean_user_msg.lower().startswith(passive_starts) and len(clean_user_msg.split()) < 10:
            return None

        # 2. Check available concepts
        concepts = db.query(Concept).filter(Concept.project_id == project_id).all()
        if not concepts:
            return None

        # 3. Idempotency check
        evidence_id = f"tutor_msg_{user_message_id}"
        existing_history = (
            db.query(MasteryHistory)
            .filter(MasteryHistory.evidence_id == evidence_id)
            .first()
        )
        if existing_history:
            return (
                db.query(ConceptMastery)
                .filter_by(user_id=user_id, concept_id=existing_history.concept_id)
                .first()
            )

        # 4. Structured AI classification
        concepts_list_str = "\n".join([f"- {c.name}: {c.description}" for c in concepts])
        messages = [
            {"role": "system", "content": TUTOR_EVIDENCE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": TUTOR_EVIDENCE_USER_PROMPT.format(
                    concepts_list=concepts_list_str,
                    user_message=clean_user_msg,
                    tutor_response=tutor_response,
                ),
            },
        ]

        signal: Optional[TutorEvidenceSignal] = None
        try:
            content, usage, latency_ms = self.llm.generate_chat_completion(
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,
            )

            record_ai_telemetry(
                db=db,
                user_id=user_id,
                feature="tutor_mastery_signal",
                model=self.llm.model,
                latency_ms=latency_ms,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                status="success",
                project_id=project_id,
            )

            parsed = json.loads(content)
            signal = TutorEvidenceSignal.model_validate(parsed)
        except Exception as e:
            logger.warning("Tutor mastery classification error: %s", e)
            record_ai_telemetry(
                db=db,
                user_id=user_id,
                feature="tutor_mastery_signal",
                model=self.llm.model,
                latency_ms=0,
                status="error",
                error_message=str(e),
                project_id=project_id,
            )
            return None

        # 5. Apply conservative thresholds
        if not signal or not signal.has_learning_signal or signal.understanding_score < 0.60:
            return None

        # Find matching concept
        matched_concept = None
        if signal.relevant_concept_names:
            target_name = signal.relevant_concept_names[0].lower()
            for c in concepts:
                if c.name.lower() in target_name or target_name in c.name.lower():
                    matched_concept = c
                    break

        if not matched_concept and concepts:
            matched_concept = concepts[0]

        if not matched_concept:
            return None

        evidence_score = signal.understanding_score * 100.0
        return self.record_concept_evidence(
            db=db,
            user_id=user_id,
            project_id=project_id,
            concept_id=matched_concept.id,
            evidence_score=evidence_score,
            source="tutor",
            evidence_id=evidence_id,
            evidence_details={
                "rationale": signal.rationale,
                "understanding_score": signal.understanding_score,
                "concept_name": matched_concept.name,
            },
        )


_mastery_service: Optional[MasteryService] = None


def get_mastery_service() -> MasteryService:
    global _mastery_service
    if _mastery_service is None:
        _mastery_service = MasteryService()
    return _mastery_service
