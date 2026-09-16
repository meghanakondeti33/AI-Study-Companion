import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Session
from app.database import Base

logger = logging.getLogger(__name__)


class AIRequest(Base):
    """Audit and telemetry log of AI invocations across the platform."""
    __tablename__ = "ai_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    feature = Column(String(50), nullable=False, index=True)  # 'tutor', 'embeddings', etc.
    model = Column(String(100), nullable=False)
    prompt_tokens = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    latency_ms = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="success")  # 'success' | 'error'
    error_message = Column(Text, nullable=True)
    retrieval_chunks_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


def record_ai_telemetry(
    db: Session,
    user_id: str,
    feature: str,
    model: str,
    latency_ms: int,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    status: str = "success",
    error_message: str | None = None,
    project_id: str | None = None,
    retrieval_chunks_count: int = 0,
) -> AIRequest:
    """Persist an AI telemetry record for cost, latency, and token monitoring."""
    record = AIRequest(
        user_id=user_id,
        project_id=project_id,
        feature=feature,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        latency_ms=latency_ms,
        status=status,
        error_message=error_message,
        retrieval_chunks_count=retrieval_chunks_count,
    )
    db.add(record)
    try:
        db.flush()
        logger.info(
            "AI Telemetry: feature=%s model=%s latency=%dms tokens=%d status=%s",
            feature,
            model,
            latency_ms,
            record.total_tokens,
            status,
        )
    except Exception as e:
        logger.warning("Failed to flush AI telemetry: %s", e)
    return record


class AIEvaluation(Base):
    """Lightweight AI evaluation signals for regression and observability."""
    __tablename__ = "ai_evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ai_request_id = Column(String(36), ForeignKey("ai_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    evaluator_type = Column(String(100), nullable=False, index=True)  # e.g., 'citation_validity'
    score = Column(Integer, nullable=False, default=0) # e.g. 0 to 100
    passed = Column(Boolean, nullable=False, default=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
