from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List
import redis
from sqlalchemy import func, case, desc, text
from sqlalchemy.orm import Session

from app.config import settings
from app.modules.users.models import User
from app.modules.spaces.models import Space
from app.modules.projects.models import Project
from app.modules.materials.models import Material
from app.modules.assessment.models import Quiz, QuizAttempt
from app.modules.events.models import LearningEvent
from app.modules.ai.models import AIRequest, AIEvaluation
from app.modules.jobs.models import BackgroundJob
from app.modules.admin import schemas


def get_admin_stats(db: Session) -> schemas.AdminStatsResponse:
    """Aggregate high-level system metrics."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0
    total_spaces = db.query(func.count(Space.id)).scalar() or 0
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_materials = db.query(func.count(Material.id)).scalar() or 0
    total_quizzes = db.query(func.count(Quiz.id)).scalar() or 0
    total_quiz_attempts = db.query(func.count(QuizAttempt.id)).scalar() or 0
    total_ai_requests = db.query(func.count(AIRequest.id)).scalar() or 0
    total_background_jobs = db.query(func.count(BackgroundJob.id)).scalar() or 0

    return schemas.AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_spaces=total_spaces,
        total_projects=total_projects,
        total_materials=total_materials,
        total_quizzes=total_quizzes,
        total_quiz_attempts=total_quiz_attempts,
        total_ai_requests=total_ai_requests,
        total_background_jobs=total_background_jobs,
    )


def get_admin_users(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
) -> schemas.AdminUserListResponse:
    """List users with summary metrics without exposing credentials."""
    query = db.query(User)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter((User.email.ilike(search_term)) | (User.name.ilike(search_term)))

    total = query.count()
    users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()

    items: List[schemas.AdminUserItem] = []
    for u in users:
        spaces_count = db.query(func.count(Space.id)).filter(Space.user_id == u.id).scalar() or 0
        projects_count = db.query(func.count(Project.id)).filter(Project.user_id == u.id).scalar() or 0
        last_event = (
            db.query(LearningEvent.created_at)
            .filter(LearningEvent.user_id == u.id)
            .order_by(desc(LearningEvent.created_at))
            .first()
        )
        last_activity = last_event[0] if last_event else None

        items.append(
            schemas.AdminUserItem(
                id=u.id,
                email=u.email,
                name=u.name,
                is_active=u.is_active,
                is_admin=getattr(u, "is_admin", False),
                created_at=u.created_at,
                updated_at=u.updated_at,
                spaces_count=spaces_count,
                projects_count=projects_count,
                last_activity_at=last_activity,
            )
        )

    return schemas.AdminUserListResponse(
        users=items,
        total=total,
        limit=limit,
        offset=offset,
    )


def get_admin_projects(
    db: Session,
    limit: int = 50,
    offset: int = 0,
) -> schemas.AdminProjectListResponse:
    """List projects across all spaces and users with activity overview."""
    query = db.query(Project).join(Space, Project.space_id == Space.id).join(User, Project.user_id == User.id)
    total = query.count()
    projects = query.order_by(desc(Project.created_at)).offset(offset).limit(limit).all()

    items: List[schemas.AdminProjectItem] = []
    for p in projects:
        space = db.query(Space).filter(Space.id == p.space_id).first()
        user = db.query(User).filter(User.id == p.user_id).first()
        materials_count = db.query(func.count(Material.id)).filter(Material.project_id == p.id).scalar() or 0
        quizzes_count = db.query(func.count(Quiz.id)).filter(Quiz.project_id == p.id).scalar() or 0

        items.append(
            schemas.AdminProjectItem(
                id=p.id,
                name=p.name,
                description=p.description,
                learning_goal=p.learning_goal,
                space_id=p.space_id,
                space_name=space.name if space else "Unknown Space",
                user_id=p.user_id,
                user_email=user.email if user else "unknown",
                user_name=user.name if user else "Unknown",
                materials_count=materials_count,
                quizzes_count=quizzes_count,
                created_at=p.created_at,
            )
        )

    return schemas.AdminProjectListResponse(
        projects=items,
        total=total,
        limit=limit,
        offset=offset,
    )


def _format_event_description(event: LearningEvent) -> str:
    et = event.event_type
    if et == "space_created":
        return "Created a new learning space"
    elif et == "project_created":
        return "Created a new project"
    elif et == "material_uploaded":
        return "Uploaded study material document"
    elif et == "material_processed":
        return "Material document processing completed"
    elif et == "tutor_question_asked":
        return "Asked the AI Tutor a question"
    elif et == "quiz_generated":
        return "Generated an adaptive quiz"
    elif et == "quiz_completed":
        score = event.event_data.get("score", 0) if event.event_data else 0
        return f"Completed quiz assessment (Score: {score}%)"
    elif et == "recommendation_generated":
        return "System generated a personalized recommendation"
    elif et == "recommendation_completed":
        return "Completed learning recommendation"
    return f"Activity recorded: {et}"


def get_admin_learning_activity(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    event_type: Optional[str] = None,
) -> schemas.AdminActivityListResponse:
    """Retrieve system-wide recent learning events."""
    query = db.query(LearningEvent)
    if event_type:
        query = query.filter(LearningEvent.event_type == event_type)

    total = query.count()
    events = query.order_by(desc(LearningEvent.created_at)).offset(offset).limit(limit).all()

    items: List[schemas.AdminActivityItem] = []
    for e in events:
        user = db.query(User).filter(User.id == e.user_id).first()
        items.append(
            schemas.AdminActivityItem(
                id=e.id,
                user_id=e.user_id,
                user_email=user.email if user else "unknown",
                project_id=e.project_id,
                event_type=e.event_type,
                description=_format_event_description(e),
                created_at=e.created_at,
            )
        )

    return schemas.AdminActivityListResponse(
        events=items,
        total=total,
    )


def get_admin_ai_observability(
    db: Session,
    days: int = 30,
) -> schemas.AdminAIObservabilityResponse:
    """Aggregate system-wide AI requests and evaluation metrics."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    query = db.query(AIRequest).filter(AIRequest.created_at >= cutoff)
    total_reqs = query.count()
    success_reqs = query.filter(AIRequest.status == "success").count()
    failed_reqs = query.filter(AIRequest.status == "error").count()

    avg_latency = (
        db.query(func.avg(AIRequest.latency_ms))
        .filter(AIRequest.created_at >= cutoff)
        .scalar()
        or 0.0
    )
    total_tokens = (
        db.query(func.sum(AIRequest.total_tokens))
        .filter(AIRequest.created_at >= cutoff)
        .scalar()
        or 0
    )

    feature_stats: List[schemas.AdminAIFeatureStat] = []
    if total_reqs > 0:
        rows = (
            db.query(
                AIRequest.feature,
                func.count(AIRequest.id).label("total"),
                func.sum(case((AIRequest.status == "success", 1), else_=0)).label("success"),
                func.sum(case((AIRequest.status == "error", 1), else_=0)).label("error"),
                func.avg(AIRequest.latency_ms).label("avg_lat"),
                func.sum(AIRequest.total_tokens).label("tokens"),
            )
            .filter(AIRequest.created_at >= cutoff)
            .group_by(AIRequest.feature)
            .all()
        )
        for r in rows:
            feature_stats.append(
                schemas.AdminAIFeatureStat(
                    feature=r.feature,
                    total_requests=r.total,
                    successful_requests=r.success or 0,
                    failed_requests=r.error or 0,
                    average_latency_ms=float(r.avg_lat or 0.0),
                    total_tokens=r.tokens or 0,
                )
            )

    # Evaluation metrics
    eval_query = db.query(AIEvaluation).filter(AIEvaluation.created_at >= cutoff)
    eval_total = eval_query.count()
    eval_passed = eval_query.filter(AIEvaluation.passed == True).count()
    eval_failed = eval_query.filter(AIEvaluation.passed == False).count()
    eval_avg_score = (
        db.query(func.avg(AIEvaluation.score))
        .filter(AIEvaluation.created_at >= cutoff)
        .scalar()
        or 0.0
    )

    return schemas.AdminAIObservabilityResponse(
        total_requests=total_reqs,
        successful_requests=success_reqs,
        failed_requests=failed_reqs,
        average_latency_ms=float(avg_latency),
        total_tokens=total_tokens,
        features=feature_stats,
        evaluations=schemas.AdminAIEvaluationStats(
            total_evaluations=eval_total,
            passed_evaluations=eval_passed,
            failed_evaluations=eval_failed,
            average_score=float(eval_avg_score),
        ),
    )


def get_admin_jobs(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    status_filter: Optional[str] = None,
) -> schemas.AdminJobsResponse:
    """Retrieve system background jobs summary and recent logs."""
    queued = db.query(func.count(BackgroundJob.id)).filter(BackgroundJob.status == "QUEUED").scalar() or 0
    running = db.query(func.count(BackgroundJob.id)).filter(BackgroundJob.status == "RUNNING").scalar() or 0
    completed = db.query(func.count(BackgroundJob.id)).filter(BackgroundJob.status == "COMPLETED").scalar() or 0
    failed = db.query(func.count(BackgroundJob.id)).filter(BackgroundJob.status == "FAILED").scalar() or 0

    query = db.query(BackgroundJob)
    if status_filter:
        query = query.filter(BackgroundJob.status == status_filter.upper())

    jobs = query.order_by(desc(BackgroundJob.created_at)).offset(offset).limit(limit).all()

    items: List[schemas.AdminJobItem] = []
    for j in jobs:
        user = db.query(User).filter(User.id == j.user_id).first()
        items.append(
            schemas.AdminJobItem(
                id=j.id,
                job_type=j.job_type,
                status=j.status,
                user_id=j.user_id,
                user_email=user.email if user else "unknown",
                project_id=j.project_id,
                attempts=j.attempts,
                error_message=j.error_message,
                started_at=j.started_at,
                completed_at=j.completed_at,
                created_at=j.created_at,
            )
        )

    return schemas.AdminJobsResponse(
        queued_count=queued,
        running_count=running,
        completed_count=completed,
        failed_count=failed,
        recent_jobs=items,
    )


def get_admin_system_health(db: Session) -> schemas.AdminSystemHealthResponse:
    """Return operational status of platform subsystems without leaking secrets."""
    db_status = "error: disconnected"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error: disconnected"

    redis_status = "error: disconnected"
    try:
        r = redis.from_url(settings.REDIS_URL, socket_timeout=2)
        if r.ping():
            redis_status = "connected"
    except Exception:
        redis_status = "error: disconnected"

    storage_status = "ready"
    try:
        storage_path = Path(settings.STORAGE_LOCAL_PATH)
        storage_path.mkdir(parents=True, exist_ok=True)
    except Exception:
        storage_status = "unavailable"

    ai_status = "configured" if bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() and settings.GEMINI_API_KEY not in ("your-gemini-api-key-here", "your-openai-api-key-here", "mock-key")) else "mock_mode"

    is_healthy = db_status == "connected" and redis_status == "connected" and storage_status == "ready"

    return schemas.AdminSystemHealthResponse(
        status="healthy" if is_healthy else "degraded",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        services={
            "database": db_status,
            "redis": redis_status,
            "storage": storage_status,
            "ai_provider": ai_status,
            "celery_broker": redis_status,
        },
    )
