from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ConceptGrowthItem(BaseModel):
    concept_id: str
    concept_name: str
    mastery_score: float
    trend_delta: float
    status: str = Field(..., description="'improving' | 'stable' | 'requiring_attention'")

    class Config:
        from_attributes = True


class GrowthSnapshotRead(BaseModel):
    id: str
    user_id: str
    project_id: str
    status: str
    overall_mastery: float
    previous_overall_mastery: Optional[float] = None
    trend_delta: float
    created_at: datetime

    class Config:
        from_attributes = True


class GrowthOverviewResponse(BaseModel):
    current_snapshot: Optional[GrowthSnapshotRead] = None
    status: str
    overall_mastery: float
    trend_delta: float
    concept_count: int
    improving_concepts: List[ConceptGrowthItem] = Field(default_factory=list)
    stable_concepts: List[ConceptGrowthItem] = Field(default_factory=list)
    attention_concepts: List[ConceptGrowthItem] = Field(default_factory=list)
