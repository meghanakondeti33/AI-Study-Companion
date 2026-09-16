import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database import Base

class BackgroundJob(Base):
    """Tracks asynchronous background jobs."""
    __tablename__ = "background_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_type = Column(String(100), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True, default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    
    entity_id = Column(String(36), nullable=True, index=True)
    entity_type = Column(String(100), nullable=True)
    
    attempts = Column(Integer, default=0, nullable=False)
    error_message = Column(String(2000), nullable=True)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User")
    project = relationship("Project")
