from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


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
    question_type: str = Field(..., pattern="^(mcq|open_ended)$")
    question_text: str = Field(..., min_length=5)
    options: Optional[List[str]] = None  # Exactly 4 options for MCQ, null for open-ended
    correct_answer: str = Field(..., min_length=1)
    explanation: str = Field(..., min_length=5)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    page_number: int = Field(..., ge=1)
    material_id: Optional[str] = None


class QuizGenerationAIResponse(BaseModel):
    questions: List[GeneratedQuestionItem] = Field(default_factory=list)


class OpenEndedEvaluation(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)
    is_correct: bool
    feedback: str = Field(..., min_length=3)
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    improvement_hint: str = Field(..., min_length=3)
