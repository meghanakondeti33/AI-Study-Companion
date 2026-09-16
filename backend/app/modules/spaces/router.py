from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.spaces.models import Space
from app.modules.spaces.schemas import SpaceCreate, SpaceUpdate, SpaceRead

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.post(
    "",
    response_model=SpaceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Space",
)
def create_space(
    payload: SpaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new Space owned by the current authenticated user."""
    space = Space(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
    )
    db.add(space)
    db.commit()
    db.refresh(space)
    return space


@router.get(
    "",
    response_model=List[SpaceRead],
    status_code=status.HTTP_200_OK,
    summary="List all Spaces owned by current user",
)
def list_spaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all Spaces belonging to the authenticated user."""
    spaces = (
        db.query(Space)
        .filter(Space.user_id == current_user.id)
        .order_by(Space.created_at.desc())
        .all()
    )
    return spaces


@router.get(
    "/{space_id}",
    response_model=SpaceRead,
    status_code=status.HTTP_200_OK,
    summary="Get a Space by ID",
)
def get_space(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a specific Space ensuring user ownership."""
    space = (
        db.query(Space)
        .filter(Space.id == space_id, Space.user_id == current_user.id)
        .first()
    )
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space not found",
        )
    return space


@router.patch(
    "/{space_id}",
    response_model=SpaceRead,
    status_code=status.HTTP_200_OK,
    summary="Update a Space",
)
def update_space(
    space_id: str,
    payload: SpaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update space details ensuring user ownership."""
    space = (
        db.query(Space)
        .filter(Space.id == space_id, Space.user_id == current_user.id)
        .first()
    )
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space not found",
        )

    if payload.name is not None:
        space.name = payload.name.strip()
    if payload.description is not None:
        space.description = payload.description.strip() if payload.description else None

    db.commit()
    db.refresh(space)
    return space


@router.delete(
    "/{space_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Space",
)
def delete_space(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a Space and its associated projects ensuring user ownership."""
    space = (
        db.query(Space)
        .filter(Space.id == space_id, Space.user_id == current_user.id)
        .first()
    )
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space not found",
        )

    db.delete(space)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
