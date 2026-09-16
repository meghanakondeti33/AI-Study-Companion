import logging
from app.celery_app import celery_app
from app.database import SessionLocal
from app.modules.learner_context.services import get_learner_context_service

logger = logging.getLogger(__name__)

@celery_app.task(name="app.modules.learner_context.tasks.async_refresh_learner_context")
def async_refresh_learner_context(user_id: str):
    """Background task to refresh the learner context for a user."""
    db = SessionLocal()
    try:
        service = get_learner_context_service()
        service.refresh_learner_context(db, user_id)
        db.commit()
    except Exception as e:
        logger.error(f"Error refreshing learner context for user {user_id}: {e}")
        db.rollback()
    finally:
        db.close()
