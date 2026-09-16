from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SpaceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class SpaceCreate(SpaceBase):
    pass


class SpaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class SpaceRead(SpaceBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
