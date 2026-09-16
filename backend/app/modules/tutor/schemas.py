from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class Citation(BaseModel):
    """Citation referencing a specific source material and page."""
    material_id: str
    page_number: int
    supporting_text: Optional[str] = None


class TutorResponse(BaseModel):
    """Validated output structure for AI Tutor answers."""
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    grounded: bool = True
    sources: List[dict] = Field(default_factory=list)


class ConversationCreate(BaseModel):
    title: Optional[str] = None


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class MessageRead(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: Optional[List[dict]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationRead(BaseModel):
    id: str
    user_id: str
    project_id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailRead(ConversationRead):
    messages: List[MessageRead] = Field(default_factory=list)
