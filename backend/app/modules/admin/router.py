from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import require_admin
from app.modules.users.models import User
from app.modules.admin import schemas, services

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/stats",
    response_model=schemas.AdminStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated administrative system metrics",
)
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Retrieve platform-wide aggregate counts and counters."""
    return services.get_admin_stats(db=db)


@router.get(
    "/users",
    response_model=schemas.AdminUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List users with engagement summary",
)
def list_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List registered users with activity indicators (excluding credentials)."""
    return services.get_admin_users(db=db, limit=limit, offset=offset, search=search)


@router.get(
    "/projects",
    response_model=schemas.AdminProjectListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all spaces and projects across the system",
)
def list_projects(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List projects across users and spaces with material counts."""
    return services.get_admin_projects(db=db, limit=limit, offset=offset)


@router.get(
    "/learning-activity",
    response_model=schemas.AdminActivityListResponse,
    status_code=status.HTTP_200_OK,
    summary="List system-wide learning events and telemetry",
)
def list_activity(
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Retrieve platform activity timeline."""
    return services.get_admin_learning_activity(
        db=db, limit=limit, offset=offset, event_type=event_type
    )


@router.get(
    "/ai-observability",
    response_model=schemas.AdminAIObservabilityResponse,
    status_code=status.HTTP_200_OK,
    summary="Get system-wide AI usage, telemetry, and evaluation metrics",
)
def get_ai_observability(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Aggregate AI requests, latency, token usage, and quality evaluations."""
    return services.get_admin_ai_observability(db=db, days=days)


@router.get(
    "/jobs",
    response_model=schemas.AdminJobsResponse,
    status_code=status.HTTP_200_OK,
    summary="List and monitor background task queues and logs",
)
def list_jobs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None, max_length=50),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Monitor background jobs, queue state, and failure logs."""
    return services.get_admin_jobs(db=db, limit=limit, offset=offset, status_filter=status)


@router.get(
    "/system-health",
    response_model=schemas.AdminSystemHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Detailed platform system health and dependency status",
)
def get_system_health(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Detailed operational health status across database, Redis, storage, and AI providers."""
    return services.get_admin_system_health(db=db)
