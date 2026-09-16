from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.spaces.models import Space
from app.modules.projects.models import Project
from app.modules.projects.schemas import ProjectCreate, ProjectUpdate, ProjectRead

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Project",
)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Project inside an authenticated user's Space."""
    # Strict isolation check: user must own the target space
    space = (
        db.query(Space)
        .filter(Space.id == payload.space_id, Space.user_id == current_user.id)
        .first()
    )
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space not found",
        )

    project = Project(
        space_id=payload.space_id,
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        learning_goal=payload.learning_goal.strip() if payload.learning_goal else None,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get(
    "",
    response_model=List[ProjectRead],
    status_code=status.HTTP_200_OK,
    summary="List Projects owned by current user",
)
def list_projects(
    space_id: Optional[str] = Query(None, description="Optional space filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all projects belonging to the authenticated user, optionally filtered by space."""
    query = db.query(Project).filter(Project.user_id == current_user.id)
    if space_id:
        query = query.filter(Project.space_id == space_id)

    projects = query.order_by(Project.created_at.desc()).all()
    return projects


@router.get(
    "/{project_id}",
    response_model=ProjectRead,
    status_code=status.HTTP_200_OK,
    summary="Get a Project by ID",
)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a specific Project ensuring user ownership."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.patch(
    "/{project_id}",
    response_model=ProjectRead,
    status_code=status.HTTP_200_OK,
    summary="Update a Project",
)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update project details ensuring user ownership."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.description is not None:
        project.description = (
            payload.description.strip() if payload.description else None
        )
    if payload.learning_goal is not None:
        project.learning_goal = (
            payload.learning_goal.strip() if payload.learning_goal else None
        )

    db.commit()
    db.refresh(project)
    return project


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Project",
)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a Project ensuring user ownership."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
