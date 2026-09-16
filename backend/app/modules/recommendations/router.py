from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.recommendations.schemas import RecommendationRead, RecommendationActionResponse
from app.modules.recommendations.services import get_recommendation_service, RecommendationService

router = APIRouter(tags=["Recommendations"])


@router.get("/projects/{project_id}/recommendations", response_model=List[RecommendationRead])
def list_project_recommendations(
    project_id: str,
    status_filter: Optional[str] = Query("active", alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """
    List personalized recommendations for a project.
    Supports filtering by status: active, completed, dismissed.
    """
    return service.list_recommendations(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        status_filter=status_filter,
    )


@router.post("/recommendations/{recommendation_id}/complete", response_model=RecommendationActionResponse)
def complete_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Mark a recommendation as completed."""
    rec = service.complete_recommendation(
        db=db,
        recommendation_id=recommendation_id,
        user_id=current_user.id,
    )
    return RecommendationActionResponse(
        success=True,
        status="completed",
        recommendation=rec,
    )


@router.post("/recommendations/{recommendation_id}/dismiss", response_model=RecommendationActionResponse)
def dismiss_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Mark a recommendation as dismissed."""
    rec = service.dismiss_recommendation(
        db=db,
        recommendation_id=recommendation_id,
        user_id=current_user.id,
    )
    return RecommendationActionResponse(
        success=True,
        status="dismissed",
        recommendation=rec,
    )
