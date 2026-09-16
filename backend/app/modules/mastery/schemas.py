from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


# --- Concept schemas ---
class ConceptBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="")


class ConceptCreate(ConceptBase):
    pass


class ConceptRead(ConceptBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Concept Extraction schemas (for AI structured output) ---
class ConceptExtractionItem(BaseModel):
    name: str = Field(..., description="Concise, meaningful learning concept or topic name")
    description: str = Field(..., description="Brief explanation of the concept grounded in the material")


class ConceptExtractionResponse(BaseModel):
    concepts: List[ConceptExtractionItem] = Field(default_factory=list)


# --- Concept Mastery schemas ---
class ConceptMasteryRead(BaseModel):
    id: str
    user_id: str
    project_id: str
    concept_id: str
    concept_name: Optional[str] = None
    concept_description: Optional[str] = None
    mastery_score: float
    last_assessed_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Mastery History schemas ---
class MasteryHistoryRead(BaseModel):
    id: str
    user_id: str
    project_id: str
    concept_id: str
    concept_name: Optional[str] = None
    previous_score: float
    new_score: float
    source: str
    evidence_id: Optional[str] = None
    evidence_details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Tutor Evidence Classification (for AI signal check) ---
class TutorEvidenceSignal(BaseModel):
    has_learning_signal: bool = Field(
        ...,
        description="True ONLY if the user demonstrates conceptual understanding, reasoning, or application of knowledge."
    )
    relevant_concept_names: List[str] = Field(
        default_factory=list,
        description="Names of matching project concepts demonstrated in the interaction."
    )
    understanding_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Quality of conceptual understanding demonstrated (0.0 to 1.0)."
    )
    rationale: str = Field(
        default="",
        description="Brief justification for why this interaction represents or does not represent learning signal."
    )
