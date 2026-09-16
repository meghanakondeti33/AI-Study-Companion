from sqlalchemy.orm import Session
from sqlalchemy import func, Integer, case
from datetime import datetime, timedelta, timezone
from typing import List

from app.modules.events.models import LearningEvent
from app.modules.materials.models import Material
from app.modules.tutor.models import TutorConversation, TutorMessage
from app.modules.assessment.models import Quiz, QuizAttempt
from app.modules.mastery.models import Concept
from app.modules.growth.models import GrowthSnapshot
from app.modules.recommendations.models import Recommendation
from app.modules.growth.services import get_growth_service
from app.modules.projects.models import Project
from app.modules.ai.models import AIRequest
from . import schemas


def get_project_analytics(db: Session, user_id: str, project_id: str) -> schemas.ProjectAnalyticsResponse:
    # 1. Ownership check (should be done by router, but good practice here too)
    
    total_events = db.query(func.count(LearningEvent.id)).filter_by(project_id=project_id, user_id=user_id).scalar() or 0
    materials_uploaded = db.query(func.count(Material.id)).filter_by(project_id=project_id).scalar() or 0
    materials_processed = db.query(func.count(Material.id)).filter_by(project_id=project_id, status="READY").scalar() or 0
    
    tutor_questions = db.query(func.count(TutorMessage.id)).join(TutorConversation).filter(
        TutorConversation.project_id == project_id,
        TutorMessage.role == "user"
    ).scalar() or 0
    
    quizzes_created = db.query(func.count(Quiz.id)).filter_by(project_id=project_id).scalar() or 0
    
    # Quiz attempts & completion
    attempts_q = db.query(QuizAttempt).join(Quiz).filter(Quiz.project_id == project_id)
    quizzes_attempted = attempts_q.count()
    quizzes_completed = attempts_q.filter(QuizAttempt.completed_at.isnot(None)).count()
    
    # average score
    avg_score = db.query(func.avg(QuizAttempt.score)).join(Quiz).filter(
        Quiz.project_id == project_id,
        QuizAttempt.completed_at.isnot(None)
    ).scalar() or 0.0
    
    concepts_tracked = db.query(func.count(Concept.id)).filter_by(project_id=project_id).scalar() or 0
    
    active_recs = db.query(func.count(Recommendation.id)).filter_by(project_id=project_id, status="active").scalar() or 0
    completed_recs = db.query(func.count(Recommendation.id)).filter_by(project_id=project_id, status="completed").scalar() or 0
    
    # Growth overview
    growth_service = get_growth_service()
    growth_overview = growth_service.get_growth_overview(db=db, project_id=project_id, user_id=user_id)
    
    return schemas.ProjectAnalyticsResponse(
        project_id=project_id,
        total_learning_events=total_events,
        materials_uploaded=materials_uploaded,
        materials_processed=materials_processed,
        tutor_questions=tutor_questions,
        quizzes_created=quizzes_created,
        quizzes_attempted=quizzes_attempted,
        quizzes_completed=quizzes_completed,
        quiz_average_score=float(avg_score),
        concepts_tracked=concepts_tracked,
        overall_mastery=growth_overview.overall_mastery,
        improving_concepts=len(growth_overview.improving_concepts),
        stable_concepts=len(growth_overview.stable_concepts),
        attention_concepts=len(growth_overview.attention_concepts),
        active_recommendations=active_recs,
        completed_recommendations=completed_recs
    )


def get_global_analytics(db: Session, user_id: str) -> schemas.GlobalAnalyticsResponse:
    total_projects = db.query(func.count(Project.id)).filter_by(user_id=user_id).scalar() or 0
    total_events = db.query(func.count(LearningEvent.id)).filter_by(user_id=user_id).scalar() or 0
    
    # Need to aggregate across projects
    project_ids_q = db.query(Project.id).filter(Project.user_id == user_id)
    
    total_materials = db.query(func.count(Material.id)).filter(Material.project_id.in_(project_ids_q)).scalar() or 0
    total_tutor = db.query(func.count(TutorMessage.id)).join(TutorConversation).filter(
        TutorConversation.user_id == user_id,
        TutorMessage.role == "user"
    ).scalar() or 0
    
    total_quizzes = db.query(func.count(Quiz.id)).filter(Quiz.project_id.in_(project_ids_q)).scalar() or 0
    avg_score = db.query(func.avg(QuizAttempt.score)).join(Quiz).filter(
        Quiz.project_id.in_(project_ids_q),
        QuizAttempt.completed_at.isnot(None)
    ).scalar() or 0.0
    
    concepts_tracked = db.query(func.count(Concept.id)).filter(Concept.project_id.in_(project_ids_q)).scalar() or 0
    
    return schemas.GlobalAnalyticsResponse(
        total_projects=total_projects,
        total_learning_events=total_events,
        total_materials=total_materials,
        total_tutor_questions=total_tutor,
        total_quizzes=total_quizzes,
        quiz_average_score=float(avg_score),
        concepts_tracked=concepts_tracked
    )


def get_learning_activity(db: Session, user_id: str, project_id: str | None = None, days: int = 30) -> schemas.ActivityTimelineResponse:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    query = db.query(LearningEvent).filter(
        LearningEvent.user_id == user_id,
        LearningEvent.created_at >= cutoff
    )
    if project_id:
        query = query.filter(LearningEvent.project_id == project_id)
        
    events = query.order_by(LearningEvent.created_at.desc()).limit(100).all()
    
    results = []
    for e in events:
        desc = _generate_event_description(e)
        results.append(schemas.ActivityEventResponse(
            id=e.id,
            project_id=e.project_id,
            event_type=e.event_type,
            description=desc,
            created_at=e.created_at
        ))
    return schemas.ActivityTimelineResponse(events=results)


def _generate_event_description(event: LearningEvent) -> str:
    et = event.event_type
    if et == "space_created":
        return "Created a new learning space"
    elif et == "project_created":
        return "Created a new project"
    elif et == "material_uploaded":
        return "Uploaded study material"
    elif et == "material_processed":
        return "Material processing completed"
    elif et == "tutor_question_asked":
        return "Asked the AI Tutor a question"
    elif et == "quiz_generated":
        return "Generated an adaptive quiz"
    elif et == "quiz_completed":
        return f"Completed a quiz with score {event.event_data.get('score', 0)}%"
    elif et == "recommendation_generated":
        return "New learning recommendation generated"
    elif et == "recommendation_completed":
        return "Completed a learning recommendation"
    return "Learning activity recorded"


def get_ai_observability(db: Session, user_id: str, project_id: str | None = None, days: int = 30) -> schemas.AIObservabilityResponse:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    query = db.query(AIRequest).filter(
        AIRequest.user_id == user_id,
        AIRequest.created_at >= cutoff
    )
    if project_id:
        query = query.filter(AIRequest.project_id == project_id)
        
    total_reqs = query.count()
    success_reqs = query.filter(AIRequest.status == "success").count()
    failed_reqs = query.filter(AIRequest.status == "error").count()
    
    avg_latency = db.query(func.avg(AIRequest.latency_ms)).filter(
        AIRequest.user_id == user_id,
        AIRequest.created_at >= cutoff,
        (AIRequest.project_id == project_id) if project_id else True
    ).scalar() or 0.0
    
    total_tokens = db.query(func.sum(AIRequest.total_tokens)).filter(
        AIRequest.user_id == user_id,
        AIRequest.created_at >= cutoff,
        (AIRequest.project_id == project_id) if project_id else True
    ).scalar() or 0

    # Group by feature
    features = []
    if total_reqs > 0:
        group_query = db.query(
            AIRequest.feature,
            func.count(AIRequest.id).label("total"),
            func.sum(case((AIRequest.status == "success", 1), else_=0)).label("success"),
            func.sum(case((AIRequest.status == "error", 1), else_=0)).label("error"),
            func.avg(AIRequest.latency_ms).label("avg_lat"),
            func.sum(AIRequest.total_tokens).label("tokens")
        ).filter(
            AIRequest.user_id == user_id,
            AIRequest.created_at >= cutoff,
            (AIRequest.project_id == project_id) if project_id else True
        ).group_by(AIRequest.feature).all()
        
        for row in group_query:
            features.append(schemas.AIFeatureStats(
                feature=row.feature,
                total_requests=row.total,
                successful_requests=row.success or 0,
                failed_requests=row.error or 0,
                average_latency_ms=float(row.avg_lat or 0.0),
                total_tokens=row.tokens or 0
            ))
            
    return schemas.AIObservabilityResponse(
        total_requests=total_reqs,
        successful_requests=success_reqs,
        failed_requests=failed_reqs,
        average_latency_ms=float(avg_latency),
        total_tokens=total_tokens,
        features=features
    )
