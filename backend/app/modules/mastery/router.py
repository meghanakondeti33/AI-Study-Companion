from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.projects.models import Project
from app.modules.mastery.models import Concept, ConceptMastery, MasteryHistory
from app.modules.mastery.schemas import (
    ConceptRead,
    ConceptMasteryRead,
    MasteryHistoryRead,
)
from app.modules.mastery.services import get_mastery_service, MasteryService

router = APIRouter(tags=["Concept Mastery"])


def _verify_project_ownership(db: Session, project_id: str, user_id: str) -> Project:
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
    return project


@router.get("/projects/{project_id}/concepts", response_model=List[ConceptRead])
def get_project_concepts(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    mastery_service: MasteryService = Depends(get_mastery_service),
):
    """
    List all concepts for a project.
    If no concepts exist yet, triggers auto-extraction from project materials.
    """
    _verify_project_ownership(db, project_id, current_user.id)

    concepts = (
        db.query(Concept)
        .filter(Concept.project_id == project_id)
        .order_by(Concept.name.asc())
        .all()
    )

    if not concepts:
        concepts = mastery_service.extract_project_concepts(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
        )

    return concepts


@router.get("/projects/{project_id}/mastery", response_model=List[ConceptMasteryRead])
def get_project_mastery(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current mastery scores for all concepts in a project for the authenticated user.
    """
    _verify_project_ownership(db, project_id, current_user.id)

    masteries = (
        db.query(ConceptMastery)
        .filter(
            ConceptMastery.project_id == project_id,
            ConceptMastery.user_id == current_user.id,
        )
        .all()
    )

    # Enrich with concept details
    result = []
    for m in masteries:
        concept = db.query(Concept).filter(Concept.id == m.concept_id).first()
        result.append(
            ConceptMasteryRead(
                id=m.id,
                user_id=m.user_id,
                project_id=m.project_id,
                concept_id=m.concept_id,
                concept_name=concept.name if concept else "Unknown Concept",
                concept_description=concept.description if concept else "",
                mastery_score=m.mastery_score,
                last_assessed_at=m.last_assessed_at,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
        )

    return result


@router.get("/projects/{project_id}/mastery/history", response_model=List[MasteryHistoryRead])
def get_project_mastery_history(
    project_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get mastery history audit trail for the authenticated user in this project.
    """
    _verify_project_ownership(db, project_id, current_user.id)

    history_records = (
        db.query(MasteryHistory)
        .filter(
            MasteryHistory.project_id == project_id,
            MasteryHistory.user_id == current_user.id,
        )
        .order_by(MasteryHistory.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for h in history_records:
        concept = db.query(Concept).filter(Concept.id == h.concept_id).first()
        result.append(
            MasteryHistoryRead(
                id=h.id,
                user_id=h.user_id,
                project_id=h.project_id,
                concept_id=h.concept_id,
                concept_name=concept.name if concept else "Unknown Concept",
                previous_score=h.previous_score,
                new_score=h.new_score,
                source=h.source,
                evidence_id=h.evidence_id,
                evidence_details=h.evidence_details,
                created_at=h.created_at,
            )
        )

    return result


@router.get("/concepts/{concept_id}/mastery", response_model=ConceptMasteryRead)
def get_concept_mastery(
    concept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current mastery score for a specific concept for the authenticated user.
    """
    concept = db.query(Concept).filter(Concept.id == concept_id).first()
    if not concept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Concept not found",
        )

    # Verify project ownership
    _verify_project_ownership(db, concept.project_id, current_user.id)

    mastery = (
        db.query(ConceptMastery)
        .filter(
            ConceptMastery.concept_id == concept_id,
            ConceptMastery.user_id == current_user.id,
        )
        .first()
    )

    if not mastery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mastery record not found for this concept",
        )

    return ConceptMasteryRead(
        id=mastery.id,
        user_id=mastery.user_id,
        project_id=mastery.project_id,
        concept_id=mastery.concept_id,
        concept_name=concept.name,
        concept_description=concept.description,
        mastery_score=mastery.mastery_score,
        last_assessed_at=mastery.last_assessed_at,
        created_at=mastery.created_at,
        updated_at=mastery.updated_at,
    )
