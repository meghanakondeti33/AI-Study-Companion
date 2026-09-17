import pytest
import io
import uuid
from datetime import datetime, timezone, timedelta
from jose import jwt
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.core.storage import get_storage_service
from app.modules.users.models import User
from app.modules.spaces.models import Space
from app.modules.projects.models import Project
from app.modules.materials.models import Material, MaterialStatus
from app.modules.assessment.models import Quiz, QuizQuestion, QuizAttempt
from app.modules.tutor.models import TutorConversation, TutorMessage
from app.modules.learner_context.models import LearnerContext
from app.modules.mastery.models import Concept, ConceptMastery
from app.modules.growth.models import GrowthSnapshot
from app.modules.recommendations.models import Recommendation
from app.modules.jobs.models import BackgroundJob
from app.modules.events.models import LearningEvent
from app.modules.ai.models import AIRequest, AIEvaluation


def register_user(client: TestClient, email: str, is_admin: bool = False, db_session: Session = None):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": "User", "password": "Password123!"},
    )
    user_data = res.json()
    if is_admin and db_session:
        user = db_session.query(User).filter(User.id == user_data["id"]).first()
        user.is_admin = True
        db_session.commit()
        db_session.refresh(user)

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    return user_data, {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1-4. ADMIN AUTHORIZATION & ACCESS TESTS
# ==============================================================================

def test_admin_auth_and_access(client: TestClient, db_session: Session):
    admin_data, admin_headers = register_user(client, "admin_user@example.com", is_admin=True, db_session=db_session)
    user_data, user_headers = register_user(client, "regular_user@example.com", is_admin=False, db_session=db_session)

    # 1. Unauthenticated request to admin endpoint -> 401
    res_unauth = client.get("/api/v1/admin/stats")
    assert res_unauth.status_code == 401

    # 2. Non-admin request to admin endpoints -> 403 Forbidden
    admin_endpoints = [
        "/api/v1/admin/stats",
        "/api/v1/admin/users",
        "/api/v1/admin/projects",
        "/api/v1/admin/learning-activity",
        "/api/v1/admin/ai-observability",
        "/api/v1/admin/jobs",
        "/api/v1/admin/system-health",
    ]
    for ep in admin_endpoints:
        res = client.get(ep, headers=user_headers)
        assert res.status_code == 403, f"Endpoint {ep} should reject non-admin users with 403"
        assert "Admin privileges required" in res.json().get("detail", "")

    # 3. Admin request to admin endpoints -> 200 OK
    res_stats = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "total_users" in stats
    assert stats["total_users"] >= 2
    assert stats["admin_users"] >= 1

    res_users = client.get("/api/v1/admin/users", headers=admin_headers)
    assert res_users.status_code == 200
    users_list = res_users.json()
    assert "users" in users_list
    assert len(users_list["users"]) >= 2
    # Verify no password_hash or secret tokens returned
    for u in users_list["users"]:
        assert "password_hash" not in u
        assert "password" not in u

    res_projects = client.get("/api/v1/admin/projects", headers=admin_headers)
    assert res_projects.status_code == 200

    res_activity = client.get("/api/v1/admin/learning-activity", headers=admin_headers)
    assert res_activity.status_code == 200

    res_ai = client.get("/api/v1/admin/ai-observability", headers=admin_headers)
    assert res_ai.status_code == 200
    assert "total_requests" in res_ai.json()
    assert "evaluations" in res_ai.json()

    res_jobs = client.get("/api/v1/admin/jobs", headers=admin_headers)
    assert res_jobs.status_code == 200
    assert "queued_count" in res_jobs.json()

    res_health = client.get("/api/v1/admin/system-health", headers=admin_headers)
    assert res_health.status_code == 200
    assert "services" in res_health.json()


# ==============================================================================
# 5-6. JWT VALIDATION & TAMPERING TESTS
# ==============================================================================

def test_jwt_tampering_and_expiry(client: TestClient, db_session: Session):
    user_data, auth_headers = register_user(client, "jwt_test_user@example.com", is_admin=False, db_session=db_session)
    valid_token = auth_headers["Authorization"].split(" ")[1]

    # Tampered signature
    tampered_token = valid_token[:-4] + "wxyz"
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401

    # Forged token with invalid secret
    forged_payload = {"sub": user_data["id"], "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    forged_token = jwt.encode(forged_payload, "completely-wrong-secret-key-123456", algorithm="HS256")
    res_forged = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert res_forged.status_code == 401

    # Expired token
    expired_payload = {"sub": user_data["id"], "exp": datetime.now(timezone.utc) - timedelta(hours=1)}
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res_expired = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401


# ==============================================================================
# 7-14. IDOR / CROSS-USER ISOLATION TESTS
# ==============================================================================

def test_cross_user_isolation_idor(client: TestClient, db_session: Session):
    # Setup User A
    user_a, headers_a = register_user(client, "user_a@example.com", is_admin=False, db_session=db_session)
    # Setup User B
    user_b, headers_b = register_user(client, "user_b@example.com", is_admin=False, db_session=db_session)

    # 1. User A creates a space and project
    space_a = Space(id=str(uuid.uuid4()), user_id=user_a["id"], name="Space A")
    db_session.add(space_a)
    proj_a = Project(id=str(uuid.uuid4()), space_id=space_a.id, user_id=user_a["id"], name="Project A")
    db_session.add(proj_a)

    # User A material
    mat_a = Material(
        id=str(uuid.uuid4()),
        project_id=proj_a.id,
        filename="doc_a.pdf",
        original_filename="doc_a.pdf",
        file_type="application/pdf",
        file_size=1024,
        storage_key="test_storage_key_a",
        status=MaterialStatus.READY,
    )
    db_session.add(mat_a)

    # User A tutor conversation
    conv_a = TutorConversation(id=str(uuid.uuid4()), project_id=proj_a.id, user_id=user_a["id"], title="Tutor Conv A")
    db_session.add(conv_a)

    # User A quiz & question
    quiz_a = Quiz(id=str(uuid.uuid4()), project_id=proj_a.id, user_id=user_a["id"], title="Quiz A", status="READY")
    db_session.add(quiz_a)
    q_a = QuizQuestion(id=str(uuid.uuid4()), quiz_id=quiz_a.id, question_text="What is A?", question_type="mcq", options=["A", "B"], correct_answer="A", explanation="A", difficulty="medium")
    db_session.add(q_a)

    # User A quiz attempt
    attempt_a = QuizAttempt(id=str(uuid.uuid4()), quiz_id=quiz_a.id, user_id=user_a["id"])
    db_session.add(attempt_a)

    # User A concept & recommendation
    concept_a = Concept(id=str(uuid.uuid4()), project_id=proj_a.id, name="Concept A")
    db_session.add(concept_a)
    rec_a = Recommendation(id=str(uuid.uuid4()), user_id=user_a["id"], project_id=proj_a.id, recommendation_type="review", title="Rec A", description="Desc A")
    db_session.add(rec_a)

    # User A learner context
    ctx_a = LearnerContext(id=str(uuid.uuid4()), user_id=user_a["id"], context_type="strength", context_key="Topic A", context_value="Strong", source_projects=[proj_a.id])
    db_session.add(ctx_a)

    # User A background job
    job_a = BackgroundJob(id=str(uuid.uuid4()), user_id=user_a["id"], project_id=proj_a.id, job_type="process_material", status="COMPLETED")
    db_session.add(job_a)

    db_session.commit()

    # User B attempts to access User A's Space -> 404
    res_space = client.get(f"/api/v1/spaces/{space_a.id}", headers=headers_b)
    assert res_space.status_code == 404

    # User B attempts to access User A's Project -> 404
    res_proj = client.get(f"/api/v1/projects/{proj_a.id}", headers=headers_b)
    assert res_proj.status_code == 404

    # User B attempts to access User A's Material -> 404
    res_mat = client.get(f"/api/v1/materials/{mat_a.id}", headers=headers_b)
    assert res_mat.status_code == 404

    # User B attempts to access User A's Tutor Conversation -> 404
    res_conv = client.get(f"/api/v1/tutor/conversations/{conv_a.id}", headers=headers_b)
    assert res_conv.status_code == 404

    # User B attempts to access User A's Quiz -> 404
    res_quiz = client.get(f"/api/v1/quizzes/{quiz_a.id}", headers=headers_b)
    assert res_quiz.status_code == 404

    # User B attempts to access User A's Quiz Attempt -> 404
    res_attempt = client.get(f"/api/v1/attempts/{attempt_a.id}", headers=headers_b)
    assert res_attempt.status_code == 404

    # User B attempts to dismiss User A's Recommendation -> 404
    res_rec = client.post(f"/api/v1/recommendations/{rec_a.id}/dismiss", headers=headers_b)
    assert res_rec.status_code == 404

    # User B fetches learner-context -> does NOT see User A's context
    res_ctx = client.get("/api/v1/learner-context", headers=headers_b)
    assert res_ctx.status_code == 200
    for item in res_ctx.json().get("items", []):
        assert item["context_key"] != "Topic A"

    # User B fetches jobs -> does NOT see User A's jobs
    res_jobs = client.get("/api/v1/jobs", headers=headers_b)
    assert res_jobs.status_code == 200
    for job in res_jobs.json():
        assert job["id"] != job_a.id


# ==============================================================================
# 15. SENSITIVE DATA EXCLUSION TEST
# ==============================================================================

def test_sensitive_data_not_exposed(client: TestClient, db_session: Session):
    admin_data, admin_headers = register_user(client, "sec_admin@example.com", is_admin=True, db_session=db_session)
    user_data, user_headers = register_user(client, "sec_user@example.com", is_admin=False, db_session=db_session)

    # Check /auth/me
    res_me = client.get("/api/v1/auth/me", headers=user_headers)
    assert res_me.status_code == 200
    me_body = res_me.json()
    assert "password" not in me_body
    assert "password_hash" not in me_body

    # Check /admin/users
    res_users = client.get("/api/v1/admin/users", headers=admin_headers)
    assert res_users.status_code == 200
    users = res_users.json()["users"]
    for u in users:
        assert "password_hash" not in u
        assert "password" not in u


# ==============================================================================
# 16. UPLOAD PATH TRAVERSAL & FILENAME SANITIZATION TEST
# ==============================================================================

def test_upload_security_and_path_traversal(client: TestClient, db_session: Session):
    storage = get_storage_service()
    content = b"%PDF-1.4 test document content"

    # Filename with path traversal sequences
    malicious_filename = "../../../../../etc/passwd.pdf"
    storage_key = storage.save_file(content, malicious_filename)

    # Ensure key does not escape base directory
    target_path = storage.get_file_path(storage_key)
    base_dir = str(storage.base_dir)
    assert str(target_path).startswith(base_dir)
    assert ".." not in storage_key


# ==============================================================================
# 17. HEALTH ENDPOINT SENSITIVE DATA PROTECTION TEST
# ==============================================================================

def test_health_endpoint_safety(client: TestClient):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()

    assert "status" in body
    assert "services" in body
    # Verify no raw passwords, connection strings, or tokens are exposed
    serialized = str(body)
    assert "postgres:" not in serialized
    assert "redis://" not in serialized
    assert settings.SECRET_KEY not in serialized
    if settings.OPENAI_API_KEY:
        assert settings.OPENAI_API_KEY not in serialized
