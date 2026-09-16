import logging
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from app.modules.mastery.models import ConceptMastery, Concept
from app.modules.learner_context.models import LearnerContext

logger = logging.getLogger(__name__)

class LearnerContextService:
    def refresh_learner_context(self, db: Session, user_id: str) -> None:
        """
        Deterministically aggregates cross-project mastery evidence to 
        identify recurring strengths and weaknesses for a user.
        """
        # 1. Fetch all concept masteries for user, joined with concept
        masteries = (
            db.query(ConceptMastery, Concept)
            .join(Concept, ConceptMastery.concept_id == Concept.id)
            .filter(ConceptMastery.user_id == user_id)
            .all()
        )
        
        # 2. Group by normalized concept name
        grouped: Dict[str, List[Tuple[ConceptMastery, Concept]]] = {}
        for cm, c in masteries:
            key = c.name.lower().strip()
            if key not in grouped:
                grouped[key] = []
            grouped[key].append((cm, c))
            
        # 3. Analyze and update LearnerContext
        for key, items in grouped.items():
            scores = [cm.mastery_score for cm, c in items]
            projects = list(set([cm.project_id for cm, c in items]))
            avg_score = sum(scores) / len(scores)
            
            context_type = None
            val = ""
            if avg_score >= 80.0:
                context_type = "strength"
                val = f"Demonstrates strong mastery ({avg_score:.1f}%) in '{key}'."
            elif avg_score <= 50.0:
                context_type = "weakness"
                val = f"Struggles with '{key}' (average mastery {avg_score:.1f}%)."
            
            # Upsert context
            existing = db.query(LearnerContext).filter(
                LearnerContext.user_id == user_id,
                LearnerContext.context_key == key
            ).first()
            
            if context_type:
                if existing:
                    existing.context_type = context_type
                    existing.context_value = val
                    existing.source_projects = projects
                else:
                    new_ctx = LearnerContext(
                        user_id=user_id,
                        context_type=context_type,
                        context_key=key,
                        context_value=val,
                        source_projects=projects,
                        confidence_score=1.0
                    )
                    db.add(new_ctx)
            else:
                # If neither strength nor weakness, remove existing context if any
                if existing:
                    db.delete(existing)
                    
        db.commit()
        logger.info("Refreshed learner context for user %s", user_id)

    def get_learner_context(self, db: Session, user_id: str) -> List[LearnerContext]:
        """Fetch all persistent learner context items for a user."""
        return db.query(LearnerContext).filter(LearnerContext.user_id == user_id).order_by(LearnerContext.context_key.asc()).all()

_learner_context_service = LearnerContextService()

def get_learner_context_service() -> LearnerContextService:
    return _learner_context_service
