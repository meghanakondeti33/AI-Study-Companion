import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Quiz(Base):
    """Represents a quiz generated for a user's project."""
    __tablename__ = "quizzes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="READY")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User")
    project = relationship("Project")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.id")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizAttempt.started_at.desc()")

    @property
    def question_count(self) -> int:
        return len(self.questions) if self.questions else 0



class QuizQuestion(Base):
    """Individual question within a Quiz (MCQ or Open-Ended)."""
    __tablename__ = "quiz_questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = Column(String(36), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    question_type = Column(String(20), nullable=False, index=True)  # "mcq" | "open_ended"
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)  # List[str] for MCQ, null for open-ended
    correct_answer = Column(Text, nullable=False)  # Target option text or rubric criteria
    explanation = Column(Text, nullable=False)
    source_citations = Column(JSON, nullable=True)  # List[{"material_id": str, "page_number": int}]
    difficulty = Column(String(20), nullable=False, default="medium")  # "easy" | "medium" | "hard"

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
    answers = relationship("QuizAnswer", back_populates="question", cascade="all, delete-orphan")


class QuizAttempt(Base):
    """A user taking/answering a Quiz."""
    __tablename__ = "quiz_attempts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = Column(String(36), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Float, nullable=True)  # Overall percentage score: 0.0 to 100.0

    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
    user = relationship("User")
    answers = relationship("QuizAnswer", back_populates="attempt", cascade="all, delete-orphan")


class QuizAnswer(Base):
    """Submitted answer for a specific question within a QuizAttempt."""
    __tablename__ = "quiz_answers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id = Column(String(36), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    answer_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=True)
    score = Column(Float, nullable=True)  # Question score: 0.0 to 1.0
    feedback = Column(Text, nullable=True)
    evaluation_details = Column(JSON, nullable=True)  # {"strengths": [...], "gaps": [...], "improvement_hint": "..."}
    evaluated_by = Column(String(50), nullable=False, default="system")  # "system" | "ai"
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("QuizQuestion", back_populates="answers")
