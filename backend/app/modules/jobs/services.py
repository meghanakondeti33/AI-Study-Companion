import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.jobs.models import BackgroundJob

logger = logging.getLogger(__name__)

def create_job(
    db: Session,
    job_type: str,
    user_id: str,
    project_id: str | None = None,
    entity_id: str | None = None,
    entity_type: str | None = None,
) -> BackgroundJob:
    job = BackgroundJob(
        job_type=job_type,
        user_id=user_id,
        project_id=project_id,
        entity_id=entity_id,
        entity_type=entity_type,
        status="QUEUED"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

def mark_job_running(db: Session, job_id: str, attempt: int = 1):
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
    if job:
        job.status = "RUNNING"
        job.attempts = attempt
        if not job.started_at:
            job.started_at = datetime.now(timezone.utc)
        db.commit()

def mark_job_completed(db: Session, job_id: str):
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
    if job:
        job.status = "COMPLETED"
        job.completed_at = datetime.now(timezone.utc)
        db.commit()

def mark_job_failed(db: Session, job_id: str, error_message: str):
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
    if job:
        job.status = "FAILED"
        job.error_message = error_message
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
