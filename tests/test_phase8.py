import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.modules.events.models import emit_learning_event, LearningEvent
from app.modules.jobs.models import BackgroundJob
from app.modules.jobs.services import create_job, mark_job_running, mark_job_completed, mark_job_failed
from app.modules.materials.models import Material, MaterialStatus
from app.main import app

@pytest.fixture
def mock_user_id():
    return "test_user_p8"

def test_1_event_idempotency(db_session: Session, mock_user_id):
    # Emit event with idempotency key
    key = "test_key_123"
    with patch("app.modules.learner_context.tasks.async_refresh_learner_context.delay"):
        ev1 = emit_learning_event(db_session, mock_user_id, "test_event", idempotency_key=key)
        
        assert ev1 is not None
        assert ev1.idempotency_key == key
        db_session.commit()
        
        # Emit again with same key
        ev2 = emit_learning_event(db_session, mock_user_id, "test_event", idempotency_key=key)
        
        # Should return the same event or not create a new one
        assert ev2.id == ev1.id
        
        count = db_session.query(LearningEvent).filter_by(idempotency_key=key).count()
        assert count == 1

def test_2_job_lifecycle(db_session: Session, mock_user_id):
    job = create_job(db_session, "test_job", mock_user_id)
    assert job.status == "QUEUED"
    
    mark_job_running(db_session, job.id, attempt=1)
    db_session.refresh(job)
    assert job.status == "RUNNING"
    assert job.attempts == 1
    assert job.started_at is not None
    
    mark_job_completed(db_session, job.id)
    db_session.refresh(job)
    assert job.status == "COMPLETED"
    assert job.completed_at is not None

def test_3_job_failure(db_session: Session, mock_user_id):
    job = create_job(db_session, "test_job", mock_user_id)
    mark_job_failed(db_session, job.id, "Something went wrong")
    db_session.refresh(job)
    assert job.status == "FAILED"
    assert job.error_message == "Something went wrong"

def test_4_get_jobs_api(client: TestClient, db_session: Session, mock_user_id):
    from app.modules.auth.dependencies import get_current_user
    from app.modules.users.models import User
    
    # Create the user in the DB so that the user exists
    user = User(id=mock_user_id, email="test@example.com", name="Test User", password_hash="pw")
    db_session.add(user)
    db_session.commit()
    
    app.dependency_overrides[get_current_user] = lambda: user
    
    job = create_job(db_session, "test_job_api", mock_user_id)
    
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert data[0]["id"] == job.id
    assert data[0]["job_type"] == "test_job_api"

def test_5_material_creates_job(client: TestClient, db_session: Session, mock_user_id):
    from app.modules.auth.dependencies import get_current_user
    from app.modules.users.models import User
    
    user = db_session.query(User).filter_by(id=mock_user_id).first()
    if not user:
        user = User(id=mock_user_id, email="test@example.com", name="Test User", password_hash="pw")
        db_session.add(user)
        db_session.commit()
        
    app.dependency_overrides[get_current_user] = lambda: user
    
    # Ensure there is a project
    from app.modules.projects.models import Project
    project = Project(id="proj_xyz", space_id="space_xyz", name="Test Proj", user_id=mock_user_id)
    db_session.add(project)
    db_session.commit()

    with patch("app.modules.materials.router.process_material_task.delay") as mock_delay:
        with patch("app.modules.learner_context.tasks.async_refresh_learner_context.delay"):
            resp = client.post(
                f"/api/v1/projects/{project.id}/materials",
                files={"file": ("test.pdf", b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n" * 10, "application/pdf")}
            )
            assert resp.status_code == 201
            
            # Verify a background job was created
            jobs = db_session.query(BackgroundJob).filter_by(job_type="material_processing", project_id=project.id).all()
            assert len(jobs) == 1
            assert jobs[0].status == "QUEUED"
            
            mock_delay.assert_called_once()
        
    app.dependency_overrides.pop(get_current_user, None)
