from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.projects.models import Project
from app.modules.users.models import User
from . import schemas, services

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/global", response_model=schemas.GlobalAnalyticsResponse)
def get_global_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get high-level analytics across all projects for the current user."""
    return services.get_global_analytics(db, current_user.id)


@router.get("/projects/{project_id}", response_model=schemas.ProjectAnalyticsResponse)
def get_project_analytics(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed analytics for a specific project."""
    project = db.query(Project).filter_by(id=project_id, user_id=current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return services.get_project_analytics(db, current_user.id, project_id)


@router.get("/activity", response_model=schemas.ActivityTimelineResponse)
def get_activity_timeline(
    project_id: str | None = None,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chronological timeline of learning activities."""
    if project_id:
        project = db.query(Project).filter_by(id=project_id, user_id=current_user.id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
    return services.get_learning_activity(db, current_user.id, project_id, days)


@router.get("/ai-observability", response_model=schemas.AIObservabilityResponse)
def get_ai_observability(
    project_id: str | None = None,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get telemetry and observability metrics for AI requests."""
    if project_id:
        project = db.query(Project).filter_by(id=project_id, user_id=current_user.id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
    return services.get_ai_observability(db, current_user.id, project_id, days)
