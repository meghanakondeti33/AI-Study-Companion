from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.jobs.models import BackgroundJob
from app.modules.jobs.schemas import BackgroundJobRead

router = APIRouter(tags=["Jobs"])

@router.get(
    "/jobs",
    response_model=List[BackgroundJobRead],
)
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all background jobs for the authenticated user."""
    jobs = (
        db.query(BackgroundJob)
        .filter(BackgroundJob.user_id == current_user.id)
        .order_by(BackgroundJob.created_at.desc())
        .limit(100)
        .all()
    )
    return jobs
