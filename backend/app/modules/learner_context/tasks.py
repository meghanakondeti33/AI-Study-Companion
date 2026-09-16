import logging
from app.celery_app import celery_app
from app.database import SessionLocal
from app.modules.learner_context.services import get_learner_context_service

logger = logging.getLogger(__name__)

@celery_app.task(
    bind=True,
    name="app.modules.learner_context.tasks.async_refresh_learner_context",
    max_retries=3,
    default_retry_delay=5,
)
def async_refresh_learner_context(self, user_id: str):
    """Background task to refresh the learner context for a user."""
    db = SessionLocal()
    try:
        service = get_learner_context_service()
        service.refresh_learner_context(db, user_id)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error refreshing learner context for user {user_id}: {e}")
        countdown = 5 * (2 ** self.request.retries)
        raise self.retry(exc=e, countdown=countdown)
    finally:
        db.close()
