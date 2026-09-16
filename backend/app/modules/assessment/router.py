import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.assessment.models import QuizAttempt
from app.modules.assessment.schemas import (
    QuizCreateRequest,
    QuizRead,
    QuizDetailRead,
    AttemptRead,
    AnswerSubmit,
    AnswerRead,
)
from app.modules.assessment.services import get_quiz_service, QuizService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Assessment"])


@router.post(
    "/projects/{project_id}/quizzes",
    response_model=QuizDetailRead,
    status_code=status.HTTP_201_CREATED,
)
def create_quiz(
    project_id: str,
    payload: QuizCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
):
    """Generate a grounded, adaptive quiz from processed project materials."""
    return service.generate_quiz(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        request=payload,
    )


@router.get(
    "/projects/{project_id}/quizzes",
    response_model=List[QuizRead],
)
def list_quizzes(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
):
    """List all quizzes created in this project by the current user."""
    return service.list_project_quizzes(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
    )


@router.get(
    "/quizzes/{quiz_id}",
    response_model=QuizDetailRead,
)
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
):
    """Get quiz details with questions for taking the quiz."""
    return service.get_quiz(
        db=db,
        quiz_id=quiz_id,
        user_id=current_user.id,
    )


@router.post(
    "/quizzes/{quiz_id}/attempts",
    response_model=AttemptRead,
    status_code=status.HTTP_201_CREATED,
)
def start_quiz_attempt(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
):
    """Start an attempt for a quiz."""
    return service.start_attempt(
        db=db,
        quiz_id=quiz_id,
        user_id=current_user.id,
    )


@router.get(
    "/attempts/{attempt_id}",
    response_model=AttemptRead,
)
def get_quiz_attempt(
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve an attempt and its answers."""
    attempt = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id)
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found",
        )
    return attempt


@router.post(
    "/attempts/{attempt_id}/answers",
    response_model=AnswerRead,
    status_code=status.HTTP_201_CREATED,
)
def submit_quiz_answer(
    attempt_id: str,
    payload: AnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
):
    """Submit and evaluate an answer (MCQ deterministic or open-ended AI evaluated)."""
    return service.submit_answer(
        db=db,
        attempt_id=attempt_id,
        user_id=current_user.id,
        question_id=payload.question_id,
        answer_text=payload.answer_text,
    )


@router.post(
    "/attempts/{attempt_id}/complete",
    response_model=AttemptRead,
)
def complete_quiz_attempt(
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
):
    """Complete a quiz attempt and calculate final score."""
    return service.complete_attempt(
        db=db,
        attempt_id=attempt_id,
        user_id=current_user.id,
    )
