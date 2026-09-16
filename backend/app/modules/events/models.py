import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship, Session
from sqlalchemy.exc import IntegrityError
from app.database import Base

logger = logging.getLogger(__name__)


class LearningEvent(Base):
    """Auditable log of core learning and system events."""
    __tablename__ = "learning_events"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uix_learning_events_user_id_idempotency_key"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    event_data = Column(JSON, nullable=False, default=dict)
    idempotency_key = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    project = relationship("Project")


def emit_learning_event(
    db: Session,
    user_id: str,
    event_type: str,
    project_id: str | None = None,
    event_data: dict | None = None,
    idempotency_key: str | None = None,
) -> LearningEvent:
    """Record an auditable learning event in the database."""
    event = LearningEvent(
        user_id=user_id,
        project_id=project_id,
        event_type=event_type,
        event_data=event_data or {},
        idempotency_key=idempotency_key,
    )
    try:
        with db.begin_nested():
            db.add(event)
            db.flush()
            
        logger.info("Learning event emitted: %s for user=%s project=%s idempotency_key=%s", event_type, user_id, project_id, idempotency_key)
        
        # Trigger learner context refresh asynchronously
        try:
            from app.modules.learner_context.tasks import async_refresh_learner_context
            async_refresh_learner_context.delay(user_id)
        except Exception as e:
            logger.warning("Failed to trigger learner context refresh task: %s", e)
            
    except IntegrityError as e:
        logger.info("Idempotent learning event skipped for key: %s (user=%s, type=%s)", idempotency_key, user_id, event_type)
        # Fetch the existing event to return it
        event = db.query(LearningEvent).filter_by(user_id=user_id, idempotency_key=idempotency_key).first()
    except Exception as e:
        db.rollback()
        logger.warning("Failed to flush learning event %s: %s", event_type, e)
    return event
