import logging
from datetime import datetime, timezone
import pymupdf
from sqlalchemy.orm import Session
from app.celery_app import celery_app
from app.database import SessionLocal
from app.core.storage import get_storage_service, StorageService
from app.modules.ai.embeddings import get_embedding_service, EmbeddingService, EmbeddingServiceError
from app.modules.materials.models import Material, MaterialPage, MaterialChunk, MaterialStatus
from app.modules.materials.chunking import chunk_page_text
from app.modules.events.models import emit_learning_event

logger = logging.getLogger(__name__)


class TransientProcessingError(Exception):
    """Raised for transient issues that Celery should retry."""
    pass


def process_material_sync(
    db: Session,
    material_id: str,
    embedding_service: EmbeddingService | None = None,
    storage_service: StorageService | None = None,
) -> Material:
    """
    Synchronous core implementation of the PDF processing workflow.
    Ensures idempotency, page-aware text extraction, text chunking,
    embedding generation, pgvector storage, and state transitions.
    """
    storage = storage_service or get_storage_service()
    embedder = embedding_service or get_embedding_service()

    # 1. Load Material
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        logger.error("Material %s not found for processing", material_id)
        raise ValueError(f"Material {material_id} not found")

    # 2. Idempotency Guard: Clean up any prior partial processing
    db.query(MaterialChunk).filter(MaterialChunk.material_id == material_id).delete()
    db.query(MaterialPage).filter(MaterialPage.material_id == material_id).delete()
    db.flush()

    # 3. Transition status to PROCESSING
    material.status = MaterialStatus.PROCESSING
    material.error_message = None
    db.commit()
    db.refresh(material)

    try:
        # 4. Read PDF file from storage
        try:
            pdf_bytes = storage.get_file(material.storage_key)
        except Exception as e:
            logger.error("Failed to read stored file %s: %s", material.storage_key, e)
            material.status = MaterialStatus.FAILED
            material.error_message = "The uploaded file could not be read from storage."
            db.commit()
            return material

        # 5. Validate PDF readability via PyMuPDF
        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
            if doc.page_count <= 0:
                raise ValueError("PDF has no pages")
        except Exception as e:
            logger.warning("Invalid or corrupt PDF for material %s: %s", material_id, e)
            material.status = MaterialStatus.FAILED
            material.error_message = "The uploaded file is corrupt or not a valid readable PDF."
            db.commit()
            return material

        # 6. Page-aware text extraction
        pages_to_create: list[MaterialPage] = []
        all_chunk_dicts: list[dict] = []
        current_chunk_idx = 0

        for page_idx in range(doc.page_count):
            page_num = page_idx + 1
            page = doc.load_page(page_idx)
            page_text = page.get_text("text") or ""

            page_record = MaterialPage(
                material_id=material.id,
                page_number=page_num,
                text=page_text,
            )
            pages_to_create.append(page_record)

            # 7. Text Chunking with source page preservation
            page_chunks = chunk_page_text(
                text=page_text,
                page_number=page_num,
                material_id=material.id,
                project_id=material.project_id,
                start_chunk_index=current_chunk_idx,
            )
            all_chunk_dicts.extend(page_chunks)
            current_chunk_idx += len(page_chunks)

        db.add_all(pages_to_create)
        db.flush()

        # 8. Generate Embeddings (batch via service abstraction)
        embeddings: list[list[float]] = []
        if all_chunk_dicts:
            chunk_texts = [c["content"] for c in all_chunk_dicts]
            try:
                embeddings = embedder.get_embeddings(chunk_texts)
            except EmbeddingServiceError as e:
                logger.error("Embedding generation failed for material %s: %s", material_id, e)
                raise TransientProcessingError(f"Embedding service transient failure: {e}") from e
            except Exception as e:
                logger.error("Unexpected embedding error for material %s: %s", material_id, e)
                raise TransientProcessingError(f"Embedding generation error: {e}") from e

        # 9. Persist chunks with pgvector embeddings
        chunks_to_create: list[MaterialChunk] = []
        for i, chunk_dict in enumerate(all_chunk_dicts):
            embedding_vec = embeddings[i] if i < len(embeddings) else None
            chunk_record = MaterialChunk(
                material_id=chunk_dict["material_id"],
                project_id=chunk_dict["project_id"],
                page_number=chunk_dict["page_number"],
                chunk_index=chunk_dict["chunk_index"],
                content=chunk_dict["content"],
                embedding=embedding_vec,
            )
            chunks_to_create.append(chunk_record)

        if chunks_to_create:
            db.add_all(chunks_to_create)

        # 10. Mark READY
        material.status = MaterialStatus.READY
        material.page_count = doc.page_count
        material.processed_at = datetime.now(timezone.utc)
        material.error_message = None
        db.commit()
        db.refresh(material)

        # 11. Emit material_processed learning event
        user_id = material.project.user_id if material.project else None
        if user_id:
            emit_learning_event(
                db=db,
                user_id=user_id,
                project_id=material.project_id,
                event_type="material_processed",
                event_data={
                    "material_id": material.id,
                    "project_id": material.project_id,
                    "page_count": doc.page_count,
                    "chunk_count": len(chunks_to_create),
                },
            )
            db.commit()

        logger.info(
            "Material %s processed successfully: %d pages, %d chunks",
            material.id,
            doc.page_count,
            len(chunks_to_create),
        )

        # 12. Extract initial concepts for the project if not already present
        try:
            from app.modules.mastery.services import get_mastery_service
            get_mastery_service().extract_project_concepts(
                db=db,
                project_id=material.project_id,
            )
        except Exception as exc:
            logger.warning("Auto concept extraction after material processing failed (non-blocking): %s", exc)

        return material

    except TransientProcessingError:
        # Re-raise for Celery retry handling
        raise
    except Exception as e:
        logger.exception("Unexpected failure processing material %s: %s", material_id, e)
        material.status = MaterialStatus.FAILED
        material.error_message = "An unexpected error occurred during document processing."
        db.commit()
        return material


@celery_app.task(
    bind=True,
    name="app.modules.materials.tasks.process_material",
    max_retries=3,
    default_retry_delay=5,
)
def process_material_task(self, material_id: str):
    """Celery background worker entrypoint with exponential backoff retries."""
    db: Session = SessionLocal()
    try:
        process_material_sync(db, material_id)
    except TransientProcessingError as exc:
        logger.warning(
            "Transient error in process_material_task (attempt %d/%d): %s",
            self.request.retries + 1,
            self.max_retries,
            exc,
        )
        countdown = 5 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=countdown)
    except Exception as exc:
        logger.error("Fatal error in process_material_task: %s", exc)
    finally:
        db.close()
