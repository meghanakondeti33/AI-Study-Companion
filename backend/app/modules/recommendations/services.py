import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.projects.models import Project
from app.modules.mastery.models import Concept, ConceptMastery, MasteryHistory
from app.modules.growth.models import GrowthSnapshot
from app.modules.recommendations.models import Recommendation
from app.modules.recommendations.schemas import RecommendationRead
from app.modules.events.models import emit_learning_event

logger = logging.getLogger(__name__)


class RecommendationService:
    """
    Personalized, evidence-based recommendations generation and lifecycle management.
    Grounded strictly in project concepts, mastery scores, and learning trends.
    """

    def generate_project_recommendations(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        growth_snapshot: Optional[GrowthSnapshot] = None,
    ) -> List[Recommendation]:
        """
        Generate actionable recommendations based on actual project evidence:
        1. Identifies concepts with low mastery (< 50%) -> 'review' (High Priority)
        2. Identifies concepts with declining trends (delta <= -5.0%) -> 'practice' (High Priority)
        3. Identifies strong or improving concepts -> 'continue' (Medium/Low Priority)
        Prevents duplicate active recommendations.
        """
        concepts = db.query(Concept).filter(Concept.project_id == project_id).all()
        if not concepts:
            return []

        masteries = (
            db.query(ConceptMastery)
            .filter(
                ConceptMastery.project_id == project_id,
                ConceptMastery.user_id == user_id,
            )
            .all()
        )
        mastery_map = {m.concept_id: m for m in masteries}
        
        cross_project_weaknesses = set()
        try:
            from app.modules.learner_context.services import get_learner_context_service
            learner_contexts = get_learner_context_service().get_learner_context(db=db, user_id=user_id)
            cross_project_weaknesses = {ctx.context_key for ctx in learner_contexts if ctx.context_type == "weakness"}
        except Exception as e:
            logger.warning("Failed to fetch learner context for recommendations: %s", e)

        created_recommendations: List[Recommendation] = []
        now = datetime.now(timezone.utc)

        for concept in concepts:
            m = mastery_map.get(concept.id)
            score = m.mastery_score if m else 0.0

            # Find latest delta
            latest_history = (
                db.query(MasteryHistory)
                .filter(
                    MasteryHistory.user_id == user_id,
                    MasteryHistory.concept_id == concept.id,
                )
                .order_by(MasteryHistory.created_at.desc())
                .first()
            )
            delta = (
                round(latest_history.new_score - latest_history.previous_score, 1)
                if latest_history
                else 0.0
            )

            # Rule 1: Declining trend -> 'practice'
            is_known_weakness = concept.name.lower().strip() in cross_project_weaknesses
            
            if delta <= -5.0:
                rec = self._create_recommendation_if_unique(
                    db=db,
                    user_id=user_id,
                    project_id=project_id,
                    target_concept_id=concept.id,
                    rec_type="practice",
                    title=f"Practice {concept.name}",
                    description=f"Your mastery in {concept.name} recently decreased by {abs(delta)}%. Take a targeted quiz to reinforce this topic.",
                    priority="high",
                    action_url=f"/projects/{project_id}?action=quiz&concept={concept.id}",
                )
                if rec:
                    created_recommendations.append(rec)

            # Rule 2: Low mastery (< 50%) -> 'review'
            elif score < 50.0:
                rec = self._create_recommendation_if_unique(
                    db=db,
                    user_id=user_id,
                    project_id=project_id,
                    target_concept_id=concept.id,
                    rec_type="review",
                    title=f"Review {concept.name}",
                    description=f"Mastery in {concept.name} is currently at {score:.1f}%. Review study materials or consult the AI Tutor to build fundamentals.",
                    priority="high" if (score < 30.0 or is_known_weakness) else "medium",
                    action_url=f"/projects/{project_id}?action=tutor&concept={concept.id}",
                )
                if rec:
                    created_recommendations.append(rec)
                    
            # Rule 3: Known cross-project weakness but ok locally -> 'revisit'
            elif is_known_weakness and score >= 50.0:
                rec = self._create_recommendation_if_unique(
                    db=db,
                    user_id=user_id,
                    project_id=project_id,
                    target_concept_id=concept.id,
                    rec_type="revisit",
                    title=f"Revisit {concept.name}",
                    description=f"You have struggled with {concept.name} in the past. Take a quick quiz to reinforce your understanding.",
                    priority="medium",
                    action_url=f"/projects/{project_id}?action=quiz&concept={concept.id}",
                )
                if rec:
                    created_recommendations.append(rec)

            # Rule 4: High mastery (>= 80%) -> 'continue'
            elif score >= 80.0 and delta >= 0.0:
                rec = self._create_recommendation_if_unique(
                    db=db,
                    user_id=user_id,
                    project_id=project_id,
                    target_concept_id=concept.id,
                    rec_type="continue",
                    title=f"Advance Beyond {concept.name}",
                    description=f"Excellent progress in {concept.name} with {score:.1f}% mastery! Continue exploring advanced topics.",
                    priority="low",
                    action_url=f"/projects/{project_id}?action=quiz",
                )
                if rec:
                    created_recommendations.append(rec)

        # Emit events for newly created recommendations
        for rec in created_recommendations:
            emit_learning_event(
                db=db,
                user_id=user_id,
                project_id=project_id,
                event_type="recommendation_generated",
                event_data={
                    "project_id": project_id,
                    "recommendation_id": rec.id,
                    "recommendation_type": rec.recommendation_type,
                    "target_concept_id": rec.target_concept_id,
                },
            )

        db.commit()
        return created_recommendations

    def _create_recommendation_if_unique(
        self,
        db: Session,
        user_id: str,
        project_id: str,
        target_concept_id: Optional[str],
        rec_type: str,
        title: str,
        description: str,
        priority: str,
        action_url: Optional[str],
    ) -> Optional[Recommendation]:
        """Prevents duplicate active recommendations for the same concept and type."""
        existing = (
            db.query(Recommendation)
            .filter(
                Recommendation.user_id == user_id,
                Recommendation.project_id == project_id,
                Recommendation.target_concept_id == target_concept_id,
                Recommendation.recommendation_type == rec_type,
                Recommendation.status == "active",
            )
            .first()
        )
        if existing:
            return None

        rec = Recommendation(
            user_id=user_id,
            project_id=project_id,
            target_concept_id=target_concept_id,
            recommendation_type=rec_type,
            title=title,
            description=description,
            priority=priority,
            action_url=action_url,
            status="active",
            created_at=datetime.now(timezone.utc),
        )
        db.add(rec)
        db.flush()
        return rec

    def list_recommendations(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        status_filter: Optional[str] = "active",
    ) -> List[RecommendationRead]:
        """List recommendations for a project with concept details."""
        project = (
            db.query(Project)
            .filter(Project.id == project_id, Project.user_id == user_id)
            .first()
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        query = db.query(Recommendation).filter(
            Recommendation.project_id == project_id,
            Recommendation.user_id == user_id,
        )
        if status_filter:
            query = query.filter(Recommendation.status == status_filter)

        recs = query.order_by(Recommendation.created_at.desc()).all()

        results = []
        for r in recs:
            concept = (
                db.query(Concept).filter(Concept.id == r.target_concept_id).first()
                if r.target_concept_id
                else None
            )
            results.append(
                RecommendationRead(
                    id=r.id,
                    user_id=r.user_id,
                    project_id=r.project_id,
                    recommendation_type=r.recommendation_type,
                    title=r.title,
                    description=r.description,
                    priority=r.priority,
                    target_concept_id=r.target_concept_id,
                    target_concept_name=concept.name if concept else None,
                    action_url=r.action_url,
                    status=r.status,
                    created_at=r.created_at,
                    completed_at=r.completed_at,
                )
            )
        return results

    def complete_recommendation(
        self,
        db: Session,
        recommendation_id: str,
        user_id: str,
    ) -> RecommendationRead:
        """Mark a recommendation as completed."""
        rec = (
            db.query(Recommendation)
            .filter(
                Recommendation.id == recommendation_id,
                Recommendation.user_id == user_id,
            )
            .first()
        )
        if not rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recommendation not found",
            )

        if rec.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Recommendation is already {rec.status}",
            )

        rec.status = "completed"
        rec.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(rec)

        concept = (
            db.query(Concept).filter(Concept.id == rec.target_concept_id).first()
            if rec.target_concept_id
            else None
        )
        return RecommendationRead(
            id=rec.id,
            user_id=rec.user_id,
            project_id=rec.project_id,
            recommendation_type=rec.recommendation_type,
            title=rec.title,
            description=rec.description,
            priority=rec.priority,
            target_concept_id=rec.target_concept_id,
            target_concept_name=concept.name if concept else None,
            action_url=rec.action_url,
            status=rec.status,
            created_at=rec.created_at,
            completed_at=rec.completed_at,
        )

    def dismiss_recommendation(
        self,
        db: Session,
        recommendation_id: str,
        user_id: str,
    ) -> RecommendationRead:
        """Mark a recommendation as dismissed."""
        rec = (
            db.query(Recommendation)
            .filter(
                Recommendation.id == recommendation_id,
                Recommendation.user_id == user_id,
            )
            .first()
        )
        if not rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recommendation not found",
            )

        if rec.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Recommendation is already {rec.status}",
            )

        rec.status = "dismissed"
        rec.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(rec)

        concept = (
            db.query(Concept).filter(Concept.id == rec.target_concept_id).first()
            if rec.target_concept_id
            else None
        )
        return RecommendationRead(
            id=rec.id,
            user_id=rec.user_id,
            project_id=rec.project_id,
            recommendation_type=rec.recommendation_type,
            title=rec.title,
            description=rec.description,
            priority=rec.priority,
            target_concept_id=rec.target_concept_id,
            target_concept_name=concept.name if concept else None,
            action_url=rec.action_url,
            status=rec.status,
            created_at=rec.created_at,
            completed_at=rec.completed_at,
        )


_recommendation_service: Optional[RecommendationService] = None


def get_recommendation_service() -> RecommendationService:
    global _recommendation_service
    if _recommendation_service is None:
        _recommendation_service = RecommendationService()
    return _recommendation_service
