import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.projects.models import Project
from app.modules.mastery.models import Concept, ConceptMastery, MasteryHistory
from app.modules.growth.models import GrowthSnapshot
from app.modules.growth.schemas import ConceptGrowthItem, GrowthOverviewResponse, GrowthSnapshotRead
from app.modules.events.models import emit_learning_event

logger = logging.getLogger(__name__)

# Configurable deterministic thresholds
IMPROVING_DELTA_THRESHOLD = 5.0
ATTENTION_DELTA_THRESHOLD = -5.0
LOW_MASTERY_THRESHOLD = 40.0


class GrowthService:
    """
    Deterministic learner growth classification and trajectory tracking.
    All classifications are computed purely by application logic without LLM inference.
    """

    @staticmethod
    def classify_growth_status(
        overall_mastery: float,
        trend_delta: float,
        has_assessments: bool = True,
    ) -> str:
        """
        Deterministic classification rule:
        - "Requiring Attention": trend_delta <= -5.0 OR (overall_mastery < 40.0 and trend_delta < 5.0)
        - "Improving": trend_delta >= +5.0
        - "Stable": neither improving nor requiring attention (small/no change)
        """
        if not has_assessments:
            return "Stable"

        # Strong positive momentum
        if trend_delta >= IMPROVING_DELTA_THRESHOLD:
            return "Improving"

        # Meaningful negative decline
        if trend_delta <= ATTENTION_DELTA_THRESHOLD:
            return "Requiring Attention"

        # Persistently low mastery with no strong positive momentum
        if overall_mastery < LOW_MASTERY_THRESHOLD:
            return "Requiring Attention"

        return "Stable"

    def compute_project_growth(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        trigger_recommendations: bool = True,
    ) -> GrowthSnapshot:
        """
        Compute and persist a new GrowthSnapshot for the learner in this project.
        Calculates overall mastery, trend delta, and emits 'growth_classified'.
        """
        # 1. Fetch current concept masteries for the user in this project
        masteries = (
            db.query(ConceptMastery)
            .filter(
                ConceptMastery.project_id == project_id,
                ConceptMastery.user_id == user_id,
            )
            .all()
        )

        has_assessments = len(masteries) > 0
        overall_mastery = (
            round(sum(m.mastery_score for m in masteries) / len(masteries), 1)
            if has_assessments
            else 0.0
        )

        # 2. Query previous snapshot for trend delta
        previous_snapshot = (
            db.query(GrowthSnapshot)
            .filter(
                GrowthSnapshot.project_id == project_id,
                GrowthSnapshot.user_id == user_id,
            )
            .order_by(GrowthSnapshot.created_at.desc())
            .first()
        )

        if previous_snapshot is not None:
            previous_overall = previous_snapshot.overall_mastery
            trend_delta = round(overall_mastery - previous_overall, 1)
        else:
            previous_overall = None
            # On first assessment snapshot, trend delta is relative to baseline 0.0
            trend_delta = round(overall_mastery, 1) if has_assessments else 0.0

        # 3. Classify status deterministically
        status_label = self.classify_growth_status(
            overall_mastery=overall_mastery,
            trend_delta=trend_delta if previous_snapshot is not None else 0.0,
            has_assessments=has_assessments,
        )

        # 4. Persist new immutable GrowthSnapshot
        now = datetime.now(timezone.utc)
        snapshot = GrowthSnapshot(
            user_id=user_id,
            project_id=project_id,
            status=status_label,
            overall_mastery=overall_mastery,
            previous_overall_mastery=previous_overall,
            trend_delta=trend_delta,
            created_at=now,
        )
        db.add(snapshot)
        db.flush()

        # 5. Emit 'growth_classified' learning event
        emit_learning_event(
            db=db,
            user_id=user_id,
            project_id=project_id,
            event_type="growth_classified",
            event_data={
                "project_id": project_id,
                "status": status_label,
                "overall_mastery": overall_mastery,
                "trend_delta": trend_delta,
            },
        )
        db.commit()
        db.refresh(snapshot)

        # 6. Trigger personalized recommendations update
        if trigger_recommendations:
            try:
                from app.modules.recommendations.services import get_recommendation_service
                get_recommendation_service().generate_project_recommendations(
                    db=db,
                    project_id=project_id,
                    user_id=user_id,
                    growth_snapshot=snapshot,
                )
            except Exception as e:
                logger.warning("Failed to refresh recommendations after growth snapshot: %s", e)

        return snapshot

    def get_growth_overview(
        self,
        db: Session,
        project_id: str,
        user_id: str,
    ) -> GrowthOverviewResponse:
        """
        Retrieve current growth state and concept-level breakdowns.
        If no snapshot exists yet, computes one dynamically.
        """
        # Verify project ownership
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

        # 1. Fetch latest snapshot or compute if none
        latest_snapshot = (
            db.query(GrowthSnapshot)
            .filter(
                GrowthSnapshot.project_id == project_id,
                GrowthSnapshot.user_id == user_id,
            )
            .order_by(GrowthSnapshot.created_at.desc())
            .first()
        )

        if not latest_snapshot:
            latest_snapshot = self.compute_project_growth(
                db=db,
                project_id=project_id,
                user_id=user_id,
            )

        # 2. Concept-level momentum analysis
        concepts = db.query(Concept).filter(Concept.project_id == project_id).all()
        masteries = (
            db.query(ConceptMastery)
            .filter(
                ConceptMastery.project_id == project_id,
                ConceptMastery.user_id == user_id,
            )
            .all()
        )
        mastery_map = {m.concept_id: m for m in masteries}

        improving_concepts: List[ConceptGrowthItem] = []
        stable_concepts: List[ConceptGrowthItem] = []
        attention_concepts: List[ConceptGrowthItem] = []

        for c in concepts:
            m = mastery_map.get(c.id)
            score = m.mastery_score if m else 0.0

            # Find latest score delta from history
            latest_history = (
                db.query(MasteryHistory)
                .filter(
                    MasteryHistory.user_id == user_id,
                    MasteryHistory.concept_id == c.id,
                )
                .order_by(MasteryHistory.created_at.desc())
                .first()
            )

            if latest_history:
                c_delta = round(latest_history.new_score - latest_history.previous_score, 1)
            else:
                c_delta = 0.0

            if c_delta >= IMPROVING_DELTA_THRESHOLD:
                c_status = "improving"
            elif c_delta <= ATTENTION_DELTA_THRESHOLD or score < LOW_MASTERY_THRESHOLD:
                c_status = "requiring_attention"
            else:
                c_status = "stable"

            item = ConceptGrowthItem(
                concept_id=c.id,
                concept_name=c.name,
                mastery_score=score,
                trend_delta=c_delta,
                status=c_status,
            )

            if c_status == "improving":
                improving_concepts.append(item)
            elif c_status == "requiring_attention":
                attention_concepts.append(item)
            else:
                stable_concepts.append(item)

        snapshot_read = GrowthSnapshotRead.model_validate(latest_snapshot) if latest_snapshot else None

        return GrowthOverviewResponse(
            current_snapshot=snapshot_read,
            status=latest_snapshot.status if latest_snapshot else "Stable",
            overall_mastery=latest_snapshot.overall_mastery if latest_snapshot else 0.0,
            trend_delta=latest_snapshot.trend_delta if latest_snapshot else 0.0,
            concept_count=len(concepts),
            improving_concepts=improving_concepts,
            stable_concepts=stable_concepts,
            attention_concepts=attention_concepts,
        )

    def get_growth_history(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        limit: int = 50,
    ) -> List[GrowthSnapshotRead]:
        """Fetch historical growth snapshots for a learner in a project."""
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

        snapshots = (
            db.query(GrowthSnapshot)
            .filter(
                GrowthSnapshot.project_id == project_id,
                GrowthSnapshot.user_id == user_id,
            )
            .order_by(GrowthSnapshot.created_at.desc())
            .limit(limit)
            .all()
        )
        return [GrowthSnapshotRead.model_validate(s) for s in snapshots]


_growth_service: Optional[GrowthService] = None


def get_growth_service() -> GrowthService:
    global _growth_service
    if _growth_service is None:
        _growth_service = GrowthService()
    return _growth_service
