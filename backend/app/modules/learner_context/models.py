import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.database import Base

class LearnerContext(Base):
    """
    Persistent learner context containing aggregated cross-project insights.
    Stores extracted strengths and weaknesses based on mastery evidence.
    """
    __tablename__ = "learner_contexts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # E.g., 'strength', 'weakness', 'preference', etc.
    context_type = Column(String, nullable=False, index=True)
    
    # E.g., 'concept_name' or 'topic'
    context_key = Column(String, nullable=False, index=True)
    
    # JSON detailing the context (e.g., "Struggles with X across 2 projects")
    context_value = Column(String, nullable=False)
    
    # 0.0 to 1.0 representing confidence in this context extraction
    confidence_score = Column(Float, nullable=False, default=1.0)
    
    # Projects this context was derived from
    source_projects = Column(JSON, nullable=False, default=list)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", backref="learner_contexts")
