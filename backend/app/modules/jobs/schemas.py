from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class BackgroundJobRead(BaseModel):
    id: str
    job_type: str
    status: str
    user_id: str
    project_id: Optional[str] = None
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    attempts: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
