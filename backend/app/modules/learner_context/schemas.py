from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class LearnerContextItem(BaseModel):
    id: str
    user_id: str
    context_type: str
    context_key: str
    context_value: str
    confidence_score: float
    source_projects: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LearnerContextResponse(BaseModel):
    items: List[LearnerContextItem]
