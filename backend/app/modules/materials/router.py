import os
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.core.storage import get_storage_service
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.projects.models import Project
from app.modules.materials.models import Material, MaterialStatus
from app.modules.materials.schemas import MaterialRead, MaterialDetailRead
from app.modules.materials.tasks import process_material_task, run_material_processing_local
from app.modules.events.models import emit_learning_event
from app.modules.jobs.services import create_job

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Materials"])


@router.post(
    "/projects/{project_id}/materials",
    response_model=MaterialRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_material(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a PDF document to a project.
    Validates ownership, MIME type, magic header, and file size.
    Enqueues an asynchronous processing job.
    """
    # 1. Verify project ownership
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

    # 2. Validate file extension
    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files (.pdf) are allowed.",
        )

    # 3. Read content and validate size
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {max_mb} MB.",
        )

    # 4. Validate magic header for PDF
    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF format: missing PDF signature.",
        )

    # 5. Persist file via StorageService
    storage = get_storage_service()
    storage_key = storage.save_file(content, filename)

    # 6. Create Material record in DB with QUEUED status
    material = Material(
        project_id=project.id,
        filename=os.path.basename(filename),
        original_filename=filename,
        file_type="application/pdf",
        file_size=len(content),
        storage_key=storage_key,
        status=MaterialStatus.QUEUED,
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # 7. Emit material_uploaded event
    emit_learning_event(
        db=db,
        user_id=current_user.id,
        project_id=project.id,
        event_type="material_uploaded",
        event_data={
            "material_id": material.id,
            "filename": material.filename,
            "file_size": material.file_size,
        },
    )
    db.commit()

    # 8. Create BackgroundJob and dispatch Celery task or BackgroundTask
    job = create_job(
        db=db,
        job_type="material_processing",
        user_id=current_user.id,
        project_id=project.id,
        entity_id=material.id,
        entity_type="material",
    )
    
    if settings.USE_CELERY:
        try:
            process_material_task.delay(material.id, job.id)
        except Exception as e:
            logger.warning(
                "Could not dispatch Celery task for material %s (worker may be offline): %s",
                material.id,
                e,
            )
    else:
        background_tasks.add_task(
            run_material_processing_local,
            material.id,
            job.id
        )

    return material


@router.get(
    "/projects/{project_id}/materials",
    response_model=List[MaterialRead],
)
def list_project_materials(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all materials uploaded to the user's project."""
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

    materials = (
        db.query(Material)
        .filter(Material.project_id == project_id)
        .order_by(Material.created_at.desc())
        .all()
    )
    return materials


@router.get(
    "/materials/{material_id}",
    response_model=MaterialDetailRead,
)
def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve material metadata and processing status with ownership verification."""
    material = (
        db.query(Material)
        .join(Project, Material.project_id == Project.id)
        .filter(Material.id == material_id, Project.user_id == current_user.id)
        .first()
    )
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )
    return material


@router.delete(
    "/materials/{material_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete material and associated storage file."""
    material = (
        db.query(Material)
        .join(Project, Material.project_id == Project.id)
        .filter(Material.id == material_id, Project.user_id == current_user.id)
        .first()
    )
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )

    # Delete storage file
    try:
        storage = get_storage_service()
        storage.delete_file(material.storage_key)
    except Exception as e:
        logger.warning("Failed to delete storage file %s: %s", material.storage_key, e)

    db.delete(material)
    db.commit()
    return None
