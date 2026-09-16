from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.growth.schemas import GrowthOverviewResponse, GrowthSnapshotRead
from app.modules.growth.services import get_growth_service, GrowthService

router = APIRouter(tags=["Learner Growth"])


@router.get("/projects/{project_id}/growth", response_model=GrowthOverviewResponse)
def get_project_growth(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: GrowthService = Depends(get_growth_service),
):
    """
    Get the learner's current growth trajectory, overall mastery, and concept momentum.
    Enforces project ownership.
    """
    return service.get_growth_overview(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
    )


@router.get("/projects/{project_id}/growth/history", response_model=List[GrowthSnapshotRead])
def get_project_growth_history(
    project_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: GrowthService = Depends(get_growth_service),
):
    """
    Get chronological growth snapshots for a learner within a project.
    Enforces project ownership.
    """
    return service.get_growth_history(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        limit=limit,
    )
