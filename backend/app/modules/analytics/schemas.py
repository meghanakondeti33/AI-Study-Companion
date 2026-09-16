from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProjectAnalyticsResponse(BaseModel):
    project_id: str
    total_learning_events: int
    materials_uploaded: int
    materials_processed: int
    tutor_questions: int
    quizzes_created: int
    quizzes_attempted: int
    quizzes_completed: int
    quiz_average_score: float
    concepts_tracked: int
    overall_mastery: float
    improving_concepts: int
    stable_concepts: int
    attention_concepts: int
    active_recommendations: int
    completed_recommendations: int


class GlobalAnalyticsResponse(BaseModel):
    total_projects: int
    total_learning_events: int
    total_materials: int
    total_tutor_questions: int
    total_quizzes: int
    quiz_average_score: float
    concepts_tracked: int


class ActivityEventResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    event_type: str
    description: str
    created_at: datetime


class ActivityTimelineResponse(BaseModel):
    events: List[ActivityEventResponse]


class AIFeatureStats(BaseModel):
    feature: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_latency_ms: float
    total_tokens: int


class AIObservabilityResponse(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_latency_ms: float
    total_tokens: int
    features: List[AIFeatureStats]
