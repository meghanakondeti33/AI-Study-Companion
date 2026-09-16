import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.projects.models import Project
from app.modules.tutor.models import TutorConversation, TutorMessage
from app.modules.tutor.schemas import (
    ConversationCreate,
    ConversationRead,
    ConversationDetailRead,
    MessageCreate,
    MessageRead,
)
from app.modules.tutor.services import get_tutor_service, TutorService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Tutor"])


@router.post(
    "/projects/{project_id}/tutor/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    project_id: str,
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new Tutor conversation scoped to the authenticated user and project."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    title = payload.title.strip() if payload.title and payload.title.strip() else "New Study Session"
    conversation = TutorConversation(
        user_id=current_user.id,
        project_id=project.id,
        title=title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get(
    "/projects/{project_id}/tutor/conversations",
    response_model=List[ConversationRead],
)
def list_project_conversations(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all tutor conversations within a user's project."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    conversations = (
        db.query(TutorConversation)
        .filter(
            TutorConversation.project_id == project_id,
            TutorConversation.user_id == current_user.id,
        )
        .order_by(TutorConversation.updated_at.desc())
        .all()
    )
    return conversations


@router.get(
    "/tutor/conversations/{conversation_id}",
    response_model=ConversationDetailRead,
)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a conversation and its messages with ownership verification."""
    conversation = (
        db.query(TutorConversation)
        .filter(
            TutorConversation.id == conversation_id,
            TutorConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


@router.post(
    "/tutor/conversations/{conversation_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
def send_tutor_message(
    conversation_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a user question to the AI Tutor.
    Executes RAG retrieval, grounded answering, citation generation, and persists messages.
    """
    # 1. Verify conversation ownership
    conversation = (
        db.query(TutorConversation)
        .filter(
            TutorConversation.id == conversation_id,
            TutorConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # 2. Execute grounded answering
    tutor_service = get_tutor_service()
    assistant_msg, _ = tutor_service.answer_question(
        db=db,
        conversation=conversation,
        user_id=current_user.id,
        question=payload.content,
    )

    return assistant_msg
