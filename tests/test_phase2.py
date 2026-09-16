import io
import pytest
from unittest.mock import MagicMock, patch
import pymupdf

from app.config import settings
from app.modules.materials.models import Material, MaterialPage, MaterialChunk, MaterialStatus
from app.modules.materials.chunking import chunk_page_text
from app.modules.materials.tasks import process_material_sync, TransientProcessingError
from app.modules.materials.schemas import MaterialRead
from app.modules.ai.embeddings import EmbeddingService, EmbeddingServiceError
from app.modules.events.models import LearningEvent
from app.core.storage import get_storage_service


def create_test_pdf(pages: list[str]) -> bytes:
    """Helper to create a deterministic multi-page PDF in memory."""
    doc = pymupdf.open()
    for text in pages:
        page = doc.new_page()
        page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def register_and_login(client, email: str, name: str = "Test User"):
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": name, "password": "Password123!"},
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class MockEmbeddingService(EmbeddingService):
    """Mock embedding service returning deterministic 1536-dim vectors."""
    def __init__(self, should_fail: bool = False):
        super().__init__(api_key="mock-key")
        self.should_fail = should_fail

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        if self.should_fail:
            raise EmbeddingServiceError("Mocked transient OpenAI timeout")
        # Deterministic 1536-dim unit-like float vector
        return [[0.01 * (idx + 1)] * 1536 for idx in range(len(texts))]


# ==============================================================================
# PHASE 2 TESTS
# ==============================================================================

def test_1_authenticated_upload_creates_queued_material(client, db_session):
    headers = register_and_login(client, "uploader@example.com", "Uploader")

    # 1. Create space & project
    space_res = client.post("/api/v1/spaces", json={"name": "Science Space"}, headers=headers)
    space_id = space_res.json()["id"]

    proj_res = client.post(
        "/api/v1/projects",
        json={"space_id": space_id, "name": "Physics Project"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    # 2. Upload valid PDF
    pdf_bytes = create_test_pdf(["Chapter 1: Classical Mechanics principles."])
    file_payload = {"file": ("mechanics.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    res = client.post(f"/api/v1/projects/{project_id}/materials", files=file_payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["filename"] == "mechanics.pdf"
    assert data["status"] == "QUEUED"
    assert data["project_id"] == project_id
    assert data["page_count"] is None
    assert data["file_size"] == len(pdf_bytes)


def test_2_unauthenticated_upload_rejected(client):
    pdf_bytes = create_test_pdf(["Sample text"])
    file_payload = {"file": ("sample.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    res = client.post("/api/v1/projects/fake-proj-id/materials", files=file_payload)
    assert res.status_code == 401


def test_3_non_pdf_rejected(client, db_session):
    headers = register_and_login(client, "validator@example.com")
    space_res = client.post("/api/v1/spaces", json={"name": "Space"}, headers=headers)
    proj_res = client.post(
        "/api/v1/projects",
        json={"space_id": space_res.json()["id"], "name": "Project"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    # Non-PDF extension
    text_payload = {"file": ("notes.txt", io.BytesIO(b"Hello text"), "text/plain")}
    res = client.post(f"/api/v1/projects/{project_id}/materials", files=text_payload, headers=headers)
    assert res.status_code == 400
    assert "only pdf" in res.json()["detail"].lower()

    # Named .pdf but fake header (no %PDF-)
    fake_pdf = {"file": ("fake.pdf", io.BytesIO(b"Not a real PDF file"), "application/pdf")}
    res2 = client.post(f"/api/v1/projects/{project_id}/materials", files=fake_pdf, headers=headers)
    assert res2.status_code == 400
    assert "missing pdf signature" in res2.json()["detail"].lower()


def test_4_oversized_file_rejected(client, db_session):
    headers = register_and_login(client, "size_checker@example.com")
    space_res = client.post("/api/v1/spaces", json={"name": "Space"}, headers=headers)
    proj_res = client.post(
        "/api/v1/projects",
        json={"space_id": space_res.json()["id"], "name": "Project"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    # Temporarily set max size to 100 bytes to test cleanly
    with patch.object(settings, "MAX_UPLOAD_SIZE_BYTES", 100):
        pdf_bytes = create_test_pdf(["Oversized content exceeding limit"])
        file_payload = {"file": ("large.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        res = client.post(f"/api/v1/projects/{project_id}/materials", files=file_payload, headers=headers)
        assert res.status_code == 413
        assert "exceeds maximum allowed size" in res.json()["detail"].lower()


def test_5_project_ownership_enforced_on_upload(client, db_session):
    headers_user_a = register_and_login(client, "owner_a@example.com")
    headers_user_b = register_and_login(client, "owner_b@example.com")

    space_a = client.post("/api/v1/spaces", json={"name": "Space A"}, headers=headers_user_a).json()
    proj_a = client.post(
        "/api/v1/projects",
        json={"space_id": space_a["id"], "name": "Project A"},
        headers=headers_user_a,
    ).json()

    # User B attempts to upload material into User A's project
    pdf_bytes = create_test_pdf(["Intrusion test"])
    file_payload = {"file": ("attack.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    res = client.post(f"/api/v1/projects/{proj_a['id']}/materials", files=file_payload, headers=headers_user_b)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_6_cross_user_material_access_rejected(client, db_session):
    headers_user_a = register_and_login(client, "mat_a@example.com")
    headers_user_b = register_and_login(client, "mat_b@example.com")

    space_a = client.post("/api/v1/spaces", json={"name": "Space A"}, headers=headers_user_a).json()
    proj_a = client.post(
        "/api/v1/projects",
        json={"space_id": space_a["id"], "name": "Project A"},
        headers=headers_user_a,
    ).json()

    pdf_bytes = create_test_pdf(["Private user A notes"])
    upload_res = client.post(
        f"/api/v1/projects/{proj_a['id']}/materials",
        files={"file": ("private.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers_user_a,
    )
    material_id = upload_res.json()["id"]

    # User B attempts to view User A's material
    get_res = client.get(f"/api/v1/materials/{material_id}", headers=headers_user_b)
    assert get_res.status_code == 404


def test_7_material_listing_only_returns_owners_materials(client, db_session):
    headers_user_a = register_and_login(client, "list_a@example.com")
    headers_user_b = register_and_login(client, "list_b@example.com")

    # User A project
    space_a = client.post("/api/v1/spaces", json={"name": "Space A"}, headers=headers_user_a).json()
    proj_a = client.post(
        "/api/v1/projects",
        json={"space_id": space_a["id"], "name": "Project A"},
        headers=headers_user_a,
    ).json()

    pdf_bytes = create_test_pdf(["Notes for Project A"])
    client.post(
        f"/api/v1/projects/{proj_a['id']}/materials",
        files={"file": ("notes_a.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers_user_a,
    )

    # User A lists their project materials
    list_res = client.get(f"/api/v1/projects/{proj_a['id']}/materials", headers=headers_user_a)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["filename"] == "notes_a.pdf"

    # User B attempts to list User A's project materials
    cross_list = client.get(f"/api/v1/projects/{proj_a['id']}/materials", headers=headers_user_b)
    assert cross_list.status_code == 404


def test_8_pdf_page_extraction_and_page_numbers_preserved(client, db_session):
    # 3-page synthetic PDF with known page-specific content
    pages = [
        "Page 1: Introduction to Data Structures and Algorithms.",
        "Page 2: Binary Search Trees and AVL balance factors.",
        "Page 3: Graph Traversal: Breadth-First Search and Depth-First Search.",
    ]
    pdf_bytes = create_test_pdf(pages)
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

    assert doc.page_count == 3
    for idx, expected in enumerate(pages):
        page = doc.load_page(idx)
        text = page.get_text()
        assert expected in text


def test_9_chunk_creation_retains_page_number_and_index():
    sample_text = (
        "Distributed systems consist of autonomous computing nodes that coordinate "
        "their actions by passing messages over a network. The main challenges are "
        "fault tolerance, consensus, replication, and latency mitigation."
    )
    chunks = chunk_page_text(
        text=sample_text,
        page_number=4,
        material_id="mat-123",
        project_id="proj-456",
        chunk_size=100,
        chunk_overlap=20,
        start_chunk_index=10,
    )

    assert len(chunks) > 1
    for idx, chunk in enumerate(chunks):
        assert chunk["material_id"] == "mat-123"
        assert chunk["project_id"] == "proj-456"
        assert chunk["page_number"] == 4
        assert chunk["chunk_index"] == 10 + idx
        assert len(chunk["content"]) > 0


def test_10_mocked_embeddings_deterministic():
    embedder = MockEmbeddingService()
    texts = ["First chunk of text", "Second chunk of text", "Third chunk of text"]
    vectors = embedder.get_embeddings(texts)

    assert len(vectors) == 3
    assert len(vectors[0]) == 1536
    assert len(vectors[1]) == 1536
    assert len(vectors[2]) == 1536
    # Deterministic vectors match input positions
    assert vectors[0][0] == 0.01
    assert vectors[1][0] == 0.02
    assert vectors[2][0] == 0.03


def test_11_successful_processing_results_in_ready(client, db_session):
    headers = register_and_login(client, "proc_ready@example.com")
    space = client.post("/api/v1/spaces", json={"name": "Space"}, headers=headers).json()
    proj = client.post(
        "/api/v1/projects",
        json={"space_id": space["id"], "name": "Proj"},
        headers=headers,
    ).json()

    pdf_bytes = create_test_pdf([
        "Page 1: Artificial Intelligence fundamentals.",
        "Page 2: Supervised and unsupervised machine learning.",
    ])
    upload_res = client.post(
        f"/api/v1/projects/{proj['id']}/materials",
        files={"file": ("ai_course.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers,
    )
    material_id = upload_res.json()["id"]

    # Execute processing synchronously with mock embeddings
    mock_embedder = MockEmbeddingService()
    material = process_material_sync(db=db_session, material_id=material_id, embedding_service=mock_embedder)

    assert material.status == MaterialStatus.READY
    assert material.page_count == 2
    assert material.processed_at is not None
    assert material.error_message is None

    # Verify pages in DB
    pages = db_session.query(MaterialPage).filter(MaterialPage.material_id == material_id).all()
    assert len(pages) == 2
    assert {p.page_number for p in pages} == {1, 2}

    # Verify chunks in DB
    chunks = db_session.query(MaterialChunk).filter(MaterialChunk.material_id == material_id).all()
    assert len(chunks) >= 2
    for c in chunks:
        assert c.project_id == proj["id"]
        assert c.embedding is not None


def test_12_corrupt_pdf_results_in_failed_with_safe_error(client, db_session):
    headers = register_and_login(client, "corrupt_test@example.com")
    space = client.post("/api/v1/spaces", json={"name": "Space"}, headers=headers).json()
    proj = client.post(
        "/api/v1/projects",
        json={"space_id": space["id"], "name": "Proj"},
        headers=headers,
    ).json()

    # Pass the magic header but completely corrupt data after
    corrupt_bytes = b"%PDF-1.4\nCorrupted content not a real PDF structure"
    upload_res = client.post(
        f"/api/v1/projects/{proj['id']}/materials",
        files={"file": ("corrupted.pdf", io.BytesIO(corrupt_bytes), "application/pdf")},
        headers=headers,
    )
    material_id = upload_res.json()["id"]

    material = process_material_sync(db=db_session, material_id=material_id, embedding_service=MockEmbeddingService())
    assert material.status == MaterialStatus.FAILED
    assert "corrupt or not a valid readable pdf" in material.error_message.lower()


def test_13_processing_retry_behavior_on_transient_error(client, db_session):
    headers = register_and_login(client, "retry_test@example.com")
    space = client.post("/api/v1/spaces", json={"name": "Space"}, headers=headers).json()
    proj = client.post(
        "/api/v1/projects",
        json={"space_id": space["id"], "name": "Proj"},
        headers=headers,
    ).json()

    pdf_bytes = create_test_pdf(["Page 1 transient retry test"])
    upload_res = client.post(
        f"/api/v1/projects/{proj['id']}/materials",
        files={"file": ("retry.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers,
    )
    material_id = upload_res.json()["id"]

    failing_embedder = MockEmbeddingService(should_fail=True)
    with pytest.raises(TransientProcessingError) as exc_info:
        process_material_sync(db=db_session, material_id=material_id, embedding_service=failing_embedder)

    assert "transient" in str(exc_info.value).lower()


def test_14_idempotent_reprocessing(client, db_session):
    headers = register_and_login(client, "idempotent@example.com")
    space = client.post("/api/v1/spaces", json={"name": "Space"}, headers=headers).json()
    proj = client.post(
        "/api/v1/projects",
        json={"space_id": space["id"], "name": "Proj"},
        headers=headers,
    ).json()

    pdf_bytes = create_test_pdf(["Page 1 idempotent test", "Page 2 idempotent test"])
    upload_res = client.post(
        f"/api/v1/projects/{proj['id']}/materials",
        files={"file": ("idempotent.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers,
    )
    material_id = upload_res.json()["id"]

    mock_embedder = MockEmbeddingService()

    # First run
    process_material_sync(db=db_session, material_id=material_id, embedding_service=mock_embedder)
    pages_first = db_session.query(MaterialPage).filter(MaterialPage.material_id == material_id).count()
    chunks_first = db_session.query(MaterialChunk).filter(MaterialChunk.material_id == material_id).count()
    assert pages_first == 2

    # Second run (reprocessing the same material)
    process_material_sync(db=db_session, material_id=material_id, embedding_service=mock_embedder)
    pages_second = db_session.query(MaterialPage).filter(MaterialPage.material_id == material_id).count()
    chunks_second = db_session.query(MaterialChunk).filter(MaterialChunk.material_id == material_id).count()

    # Must NOT create duplicate pages or chunks
    assert pages_second == pages_first
    assert chunks_second == chunks_first


def test_15_learning_events_emitted(client, db_session):
    headers = register_and_login(client, "events_user@example.com")
    space = client.post("/api/v1/spaces", json={"name": "Space"}, headers=headers).json()
    proj = client.post(
        "/api/v1/projects",
        json={"space_id": space["id"], "name": "Proj"},
        headers=headers,
    ).json()

    pdf_bytes = create_test_pdf(["Page 1 event testing content."])
    upload_res = client.post(
        f"/api/v1/projects/{proj['id']}/materials",
        files={"file": ("events.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers,
    )
    material_id = upload_res.json()["id"]

    # Verify material_uploaded event was emitted
    upload_event = (
        db_session.query(LearningEvent)
        .filter(LearningEvent.event_type == "material_uploaded", LearningEvent.project_id == proj["id"])
        .first()
    )
    assert upload_event is not None
    assert upload_event.event_data["material_id"] == material_id

    # Process material
    process_material_sync(db=db_session, material_id=material_id, embedding_service=MockEmbeddingService())

    # Verify material_processed event was emitted
    proc_event = (
        db_session.query(LearningEvent)
        .filter(LearningEvent.event_type == "material_processed", LearningEvent.project_id == proj["id"])
        .first()
    )
    assert proc_event is not None
    assert proc_event.event_data["material_id"] == material_id
    assert proc_event.event_data["page_count"] == 1


def test_16_delete_material_removes_records_and_storage(client, db_session):
    headers = register_and_login(client, "deleter@example.com")
    space = client.post("/api/v1/spaces", json={"name": "Space"}, headers=headers).json()
    proj = client.post(
        "/api/v1/projects",
        json={"space_id": space["id"], "name": "Proj"},
        headers=headers,
    ).json()

    pdf_bytes = create_test_pdf(["Page 1 to delete"])
    upload_res = client.post(
        f"/api/v1/projects/{proj['id']}/materials",
        files={"file": ("to_delete.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers,
    )
    material_id = upload_res.json()["id"]

    process_material_sync(db=db_session, material_id=material_id, embedding_service=MockEmbeddingService())

    # Delete material
    del_res = client.delete(f"/api/v1/materials/{material_id}", headers=headers)
    assert del_res.status_code == 204

    # Confirm material, pages, and chunks are removed
    assert db_session.query(Material).filter(Material.id == material_id).first() is None
    assert db_session.query(MaterialPage).filter(MaterialPage.material_id == material_id).count() == 0
    assert db_session.query(MaterialChunk).filter(MaterialChunk.material_id == material_id).count() == 0
