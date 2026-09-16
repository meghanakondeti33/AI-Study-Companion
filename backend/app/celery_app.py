from celery import Celery
from app.config import settings

celery_app = Celery(
    "ai_study_companion",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    task_default_retry_delay=5,
    task_max_retries=3,
    imports=[
        "app.modules.materials.tasks",
        "app.modules.learner_context.tasks",
    ],
)

# Placeholder test task to verify Celery worker functionality
@celery_app.task(name="app.celery_app.ping")
def ping_task():
    return "pong"
