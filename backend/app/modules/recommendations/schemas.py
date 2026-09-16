from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RecommendationRead(BaseModel):
    id: str
    user_id: str
    project_id: str
    recommendation_type: str = Field(..., description="'review' | 'practice' | 'revisit' | 'continue'")
    title: str
    description: str
    priority: str = Field(..., description="'high' | 'medium' | 'low'")
    target_concept_id: Optional[str] = None
    target_concept_name: Optional[str] = None
    action_url: Optional[str] = None
    status: str = Field(..., description="'active' | 'completed' | 'dismissed'")
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecommendationActionResponse(BaseModel):
    success: bool
    status: str
    recommendation: RecommendationRead
