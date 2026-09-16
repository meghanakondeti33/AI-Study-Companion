from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.learner_context.schemas import LearnerContextResponse
from app.modules.learner_context.services import get_learner_context_service

router = APIRouter(prefix="/learner-context", tags=["learner_context"])

@router.get("", response_model=LearnerContextResponse)
def get_learner_context(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the persistent learner context for the current user."""
    service = get_learner_context_service()
    items = service.get_learner_context(db=db, user_id=current_user.id)
    return LearnerContextResponse(items=items)

@router.post("/refresh", response_model=LearnerContextResponse)
def refresh_learner_context(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a refresh of the learner context and return the updated context."""
    service = get_learner_context_service()
    service.refresh_learner_context(db=db, user_id=current_user.id)
    items = service.get_learner_context(db=db, user_id=current_user.id)
    return LearnerContextResponse(items=items)
