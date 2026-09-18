from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class QuestionCitation(BaseModel):
    material_id: str
    page_number: int


# --- Client Request/Response Schemas ---

class QuizCreateRequest(BaseModel):
    num_questions: int = Field(default=4, ge=1, le=15)
    difficulty: Optional[str] = Field(default="medium", pattern="^(easy|medium|hard)$")
    title: Optional[str] = None


class QuestionRead(BaseModel):
    """Question schema returned during quiz-taking (correct_answer hidden)."""
    id: str
    quiz_id: str
    question_type: str
    question_text: str
    options: Optional[List[str]] = None
    difficulty: str
    source_citations: Optional[List[dict]] = None

    model_config = ConfigDict(from_attributes=True)


class QuestionDetailRead(QuestionRead):
    """Question schema with correct answer and explanation (for post-quiz review)."""
    correct_answer: str
    explanation: str


class QuizRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    question_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class QuizDetailRead(QuizRead):
    questions: List[QuestionRead] = Field(default_factory=list)


class AnswerSubmit(BaseModel):
    question_id: str
    answer_text: str = Field(..., min_length=1, max_length=5000)


class AnswerRead(BaseModel):
    id: str
    attempt_id: str
    question_id: str
    answer_text: str
    is_correct: Optional[bool] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    evaluation_details: Optional[dict] = None
    evaluated_by: str
    created_at: datetime
    question: Optional[QuestionDetailRead] = None

    model_config = ConfigDict(from_attributes=True)


class AttemptRead(BaseModel):
    id: str
    quiz_id: str
    user_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[float] = None
    answers: List[AnswerRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# --- AI Structured Output Schemas ---

class GeneratedQuestionItem(BaseModel):
    question_type: str = Field(...)
    question_text: str = Field(..., min_length=3)
    options: Optional[List[str]] = None
    correct_answer: str = Field(..., min_length=1)
    explanation: str = Field(default="", min_length=0)
    difficulty: str = Field(default="medium")
    page_number: int = Field(default=1)
    material_id: Optional[str] = None

    @field_validator("question_type", mode="before")
    @classmethod
    def normalize_question_type(cls, v: Any) -> str:
        s = str(v).strip().lower().replace("-", "_").replace(" ", "_")
        if "mcq" in s or "choice" in s:
            return "mcq"
        elif "open" in s:
            return "open_ended"
        raise ValueError(f"Invalid question_type: '{v}'. Must be 'mcq' or 'open_ended'.")


    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty(cls, v: Any) -> str:
        s = str(v).strip().lower()
        if s in ("easy", "medium", "hard"):
            return s
        return "medium"

    @field_validator("page_number", mode="before")
    @classmethod
    def normalize_page_number(cls, v: Any) -> int:
        try:
            val = int(v)
            return val if val >= 1 else 1
        except (ValueError, TypeError):
            return 1

    @field_validator("explanation", mode="before")
    @classmethod
    def normalize_explanation(cls, v: Any) -> str:
        s = str(v).strip() if v else ""
        return s if s else "Refer to supporting material."


class QuizGenerationAIResponse(BaseModel):
    questions: List[GeneratedQuestionItem] = Field(default_factory=list)


class OpenEndedEvaluation(BaseModel):
    score: float = Field(default=0.5, ge=0.0, le=1.0)
    is_correct: bool = Field(default=False)
    feedback: str = Field(default="Evaluation completed.", min_length=1)
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    improvement_hint: str = Field(default="Review the material.", min_length=1)

