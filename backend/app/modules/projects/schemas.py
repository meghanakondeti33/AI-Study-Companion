from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    learning_goal: Optional[str] = None


class ProjectCreate(ProjectBase):
    space_id: str = Field(..., min_length=1)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    learning_goal: Optional[str] = None


class ProjectRead(ProjectBase):
    id: str
    space_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
