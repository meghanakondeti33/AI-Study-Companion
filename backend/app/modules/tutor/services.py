import json
import logging
from typing import List, Tuple
from sqlalchemy.orm import Session

from app.modules.tutor.models import TutorConversation, TutorMessage
from app.modules.tutor.schemas import TutorResponse, Citation
from app.modules.tutor.prompts import (
    build_tutor_context,
    assemble_tutor_messages,
    GROUNDED_REFUSAL_MESSAGE,
)
from app.modules.retrieval.services import get_retrieval_service, RetrievalService
from app.modules.ai.llm import get_llm_service, LLMService, LLMServiceError
from app.modules.ai.models import record_ai_telemetry
from app.modules.events.models import emit_learning_event

logger = logging.getLogger(__name__)


class TutorService:
    """Orchestrates RAG retrieval, evidence threshold checks, grounded answering, and telemetry."""

    def __init__(
        self,
        retrieval_service: RetrievalService | None = None,
        llm_service: LLMService | None = None,
        evidence_threshold: float = 0.50,
    ):
        self.retrieval = retrieval_service or get_retrieval_service()
        self.llm = llm_service or get_llm_service()
        self.evidence_threshold = evidence_threshold

    def answer_question(
        self,
        db: Session,
        conversation: TutorConversation,
        user_id: str,
        question: str,
        top_k: int = 4,
    ) -> Tuple[TutorMessage, TutorResponse]:
        """
        Process a user question in a conversation:
        1. Save user message.
        2. Emit tutor_question_asked learning event.
        3. Retrieve project-scoped material chunks.
        4. Apply evidence threshold (grounded refusal if insufficient).
        5. Invoke LLM with grounding instructions.
        6. Validate model output and citations.
        7. Record AI telemetry.
        8. Save assistant message and return.
        """
        # 1. Save user message
        user_message = TutorMessage(
            conversation_id=conversation.id,
            role="user",
            content=question.strip(),
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)

        # 2. Emit learning event
        emit_learning_event(
            db=db,
            user_id=user_id,
            project_id=conversation.project_id,
            event_type="tutor_question_asked",
            event_data={
                "conversation_id": conversation.id,
                "message_id": user_message.id,
                "question_length": len(question),
            },
        )
        db.commit()

        # 3. Retrieve relevant project chunks (strict project boundary)
        retrieved_chunks = self.retrieval.search_project_chunks(
            db=db,
            project_id=conversation.project_id,
            query=question,
            top_k=top_k,
            similarity_threshold=self.evidence_threshold,
        )

        sources_metadata = [
            {
                "material_id": c.material_id,
                "page_number": c.page_number,
                "similarity": c.similarity,
                "excerpt": c.content[:150],
            }
            for c in retrieved_chunks
        ]

        # 4. Grounded Refusal if retrieval provides no evidence above threshold
        if not retrieved_chunks:
            logger.info(
                "Grounded refusal for conversation=%s: no chunks met threshold=%.2f",
                conversation.id,
                self.evidence_threshold,
            )
            tutor_response = TutorResponse(
                answer=GROUNDED_REFUSAL_MESSAGE,
                citations=[],
                grounded=False,
                sources=[],
            )

            # Record telemetry for refusal (0 latency, 0 tokens)
            record_ai_telemetry(
                db=db,
                user_id=user_id,
                project_id=conversation.project_id,
                feature="tutor",
                model="grounded_refusal_filter",
                latency_ms=0,
                prompt_tokens=0,
                completion_tokens=0,
                status="success",
                retrieval_chunks_count=0,
            )

            assistant_message = TutorMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=tutor_response.answer,
                citations=[],
            )
            db.add(assistant_message)
            db.commit()
            db.refresh(assistant_message)
            return assistant_message, tutor_response

        # 5. Assemble messages for LLM
        context_str = build_tutor_context(retrieved_chunks)
        prior_messages = [
            {"role": m.role, "content": m.content}
            for m in conversation.messages
            if m.id != user_message.id
        ]
        llm_messages = assemble_tutor_messages(
            context_str=context_str,
            recent_messages=prior_messages,
            user_question=question,
        )

        valid_page_numbers = {c.page_number for c in retrieved_chunks}
        chunk_material_map = {c.page_number: c.material_id for c in retrieved_chunks}

        # 6. Call LLM with structured output request
        try:
            raw_content, usage, latency_ms = self.llm.generate_chat_completion(
                messages=llm_messages,
                response_format={"type": "json_object"},
                temperature=0.2,
            )

            # Parse JSON output
            data = json.loads(raw_content)
            answer_text = data.get("answer", "")
            raw_citations = data.get("citations", [])
            grounded = bool(data.get("grounded", True))

            # Validate citations against actual retrieved page numbers (anti-hallucination)
            verified_citations: List[Citation] = []
            for item in raw_citations:
                page_num = item.get("page_number")
                if page_num in valid_page_numbers:
                    mat_id = item.get("material_id") or chunk_material_map.get(page_num, "")
                    verified_citations.append(
                        Citation(
                            material_id=mat_id,
                            page_number=page_num,
                            supporting_text=item.get("supporting_text"),
                        )
                    )

            tutor_response = TutorResponse(
                answer=answer_text,
                citations=verified_citations,
                grounded=grounded,
                sources=sources_metadata,
            )

            # 7. Record AI Telemetry
            record_ai_telemetry(
                db=db,
                user_id=user_id,
                project_id=conversation.project_id,
                feature="tutor",
                model=self.llm.model,
                latency_ms=latency_ms,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                status="success",
                retrieval_chunks_count=len(retrieved_chunks),
            )

        except (json.JSONDecodeError, KeyError) as parse_err:
            logger.warning("Malformed AI output from tutor: %s", parse_err)
            tutor_response = TutorResponse(
                answer="I encountered an issue structuring the educational response. Please try rephrasing your question.",
                citations=[],
                grounded=False,
                sources=sources_metadata,
            )
            record_ai_telemetry(
                db=db,
                user_id=user_id,
                project_id=conversation.project_id,
                feature="tutor",
                model=self.llm.model,
                latency_ms=0,
                status="error",
                error_message=f"JSON parse error: {parse_err}",
                retrieval_chunks_count=len(retrieved_chunks),
            )

        except LLMServiceError as llm_err:
            logger.error("LLM Provider failure: %s", llm_err)
            tutor_response = TutorResponse(
                answer="The AI Tutor service is temporarily unavailable. Please verify your connection or try again shortly.",
                citations=[],
                grounded=False,
                sources=sources_metadata,
            )
            record_ai_telemetry(
                db=db,
                user_id=user_id,
                project_id=conversation.project_id,
                feature="tutor",
                model=self.llm.model,
                latency_ms=0,
                status="error",
                error_message=str(llm_err),
                retrieval_chunks_count=len(retrieved_chunks),
            )

        # 8. Save assistant message
        citations_dump = [c.model_dump() for c in tutor_response.citations]
        assistant_message = TutorMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=tutor_response.answer,
            citations=citations_dump,
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)

        return assistant_message, tutor_response


_tutor_service: TutorService | None = None


def get_tutor_service() -> TutorService:
    global _tutor_service
    if _tutor_service is None:
        _tutor_service = TutorService()
    return _tutor_service
