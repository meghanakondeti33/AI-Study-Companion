import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class TutorConversation(Base):
    """Conversation session with the AI Tutor scoped to a specific project and user."""
    __tablename__ = "tutor_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Study Session")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User")
    project = relationship("Project")
    messages = relationship(
        "TutorMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="TutorMessage.created_at",
    )


class TutorMessage(Base):
    """Individual user query or assistant response within a tutor conversation."""
    __tablename__ = "tutor_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(
        String(36),
        ForeignKey("tutor_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)  # List of citations: [{material_id, page_number, ...}]
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    conversation = relationship("TutorConversation", back_populates="messages")
