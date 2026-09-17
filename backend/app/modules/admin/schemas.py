from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_spaces: int
    total_projects: int
    total_materials: int
    total_quizzes: int
    total_quiz_attempts: int
    total_ai_requests: int
    total_background_jobs: int


class AdminUserItem(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime
    spaces_count: int
    projects_count: int
    last_activity_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserListResponse(BaseModel):
    users: List[AdminUserItem]
    total: int
    limit: int
    offset: int


class AdminProjectItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    learning_goal: Optional[str] = None
    space_id: str
    space_name: str
    user_id: str
    user_email: str
    user_name: str
    materials_count: int
    quizzes_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminProjectListResponse(BaseModel):
    projects: List[AdminProjectItem]
    total: int
    limit: int
    offset: int


class AdminActivityItem(BaseModel):
    id: str
    user_id: str
    user_email: str
    project_id: Optional[str] = None
    event_type: str
    description: str
    created_at: datetime


class AdminActivityListResponse(BaseModel):
    events: List[AdminActivityItem]
    total: int


class AdminAIFeatureStat(BaseModel):
    feature: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_latency_ms: float
    total_tokens: int


class AdminAIEvaluationStats(BaseModel):
    total_evaluations: int
    passed_evaluations: int
    failed_evaluations: int
    average_score: float


class AdminAIObservabilityResponse(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_latency_ms: float
    total_tokens: int
    features: List[AdminAIFeatureStat]
    evaluations: AdminAIEvaluationStats


class AdminJobItem(BaseModel):
    id: str
    job_type: str
    status: str
    user_id: str
    user_email: str
    project_id: Optional[str] = None
    attempts: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminJobsResponse(BaseModel):
    queued_count: int
    running_count: int
    completed_count: int
    failed_count: int
    recent_jobs: List[AdminJobItem]


class AdminSystemHealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    services: Dict[str, str]
