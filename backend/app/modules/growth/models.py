import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.database import Base


class GrowthSnapshot(Base):
    """
    Periodic or event-driven snapshot of a learner's project-level growth.
    Captures overall mastery, trend delta, and categorical status.
    Historical records are immutable.
    """
    __tablename__ = "growth_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)  # "Improving" | "Stable" | "Requiring Attention"
    overall_mastery = Column(Float, nullable=False, default=0.0)  # 0.0 to 100.0
    previous_overall_mastery = Column(Float, nullable=True)
    trend_delta = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User")
    project = relationship("Project")
