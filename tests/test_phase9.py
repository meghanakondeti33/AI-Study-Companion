import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone, timedelta

from app.modules.projects.models import Project
from app.modules.events.models import LearningEvent
from app.modules.materials.models import Material
from app.modules.assessment.models import Quiz, QuizAttempt
from app.modules.tutor.models import TutorConversation, TutorMessage
from app.modules.ai.models import AIRequest
from app.modules.mastery.models import Concept
from app.modules.ai.evaluation import EvaluationCase, run_evaluation_suite


@pytest.fixture
def auth_data(client: TestClient):
    email = f"user_{uuid.uuid4()}@example.com"
    res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": "Test User", "password": "Password123!"}
    )
    user = res.json()
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"}
    )
    token = login_res.json()["access_token"]
    return user, {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_user(auth_data):
    return auth_data[0]


@pytest.fixture
def auth_headers(auth_data):
    return auth_data[1]


@pytest.fixture
def analytics_project(db_session: Session, test_user: dict):
    user_id = test_user["id"]
    from app.modules.spaces.models import Space
    s_id = str(uuid.uuid4())
    s = Space(id=s_id, user_id=user_id, name="Test Space")
    db_session.add(s)
    
    p_id = str(uuid.uuid4())
    p = Project(id=p_id, space_id=s_id, user_id=user_id, name="Analytics Proj", description="T")
    db_session.add(p)
    db_session.commit()
    return p


def test_project_analytics(client: TestClient, db_session: Session, test_user: dict, analytics_project: Project, auth_headers: dict):
    # Add some dummy data
    db_session.add(LearningEvent(id=str(uuid.uuid4()), user_id=test_user["id"], project_id=analytics_project.id, event_type="material_uploaded", event_data={}))
    db_session.add(LearningEvent(id=str(uuid.uuid4()), user_id=test_user["id"], project_id=analytics_project.id, event_type="quiz_completed", event_data={}))
    db_session.add(Material(
        id=str(uuid.uuid4()), 
        project_id=analytics_project.id, 
        filename="a.pdf", 
        original_filename="a.pdf",
        file_size=1024,
        storage_key="k1", 
        status="READY"
    ))
    db_session.add(Concept(id=str(uuid.uuid4()), project_id=analytics_project.id, name="C1"))
    
    q_id = str(uuid.uuid4())
    db_session.add(Quiz(id=q_id, user_id=test_user["id"], project_id=analytics_project.id, title="T1"))
    db_session.add(QuizAttempt(id=str(uuid.uuid4()), quiz_id=q_id, user_id=test_user["id"], score=80, completed_at=datetime.now(timezone.utc)))
    
    db_session.commit()
    
    res = client.get(f"/api/v1/analytics/projects/{analytics_project.id}", headers=auth_headers)
    if res.status_code != 200:
        print("ERROR:", res.json())
    assert res.status_code == 200
    data = res.json()
    assert data["project_id"] == analytics_project.id
    assert data["total_learning_events"] == 2
    assert data["materials_uploaded"] == 1
    assert data["concepts_tracked"] == 1
    assert data["quizzes_completed"] == 1
    assert data["quiz_average_score"] == 80.0


def test_global_analytics(client: TestClient, db_session: Session, test_user: dict, analytics_project: Project, auth_headers: dict):
    res = client.get("/api/v1/analytics/global", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    # At least 1 project, because of the fixture
    assert data["total_projects"] >= 1
    # total events and materials should be captured across projects


def test_learning_activity(client: TestClient, db_session: Session, test_user: dict, analytics_project: Project, auth_headers: dict):
    db_session.add(LearningEvent(
        id=str(uuid.uuid4()), 
        user_id=test_user["id"], 
        project_id=analytics_project.id, 
        event_type="test_event", 
        event_data={}
    ))
    db_session.commit()
    
    res = client.get(f"/api/v1/analytics/activity?project_id={analytics_project.id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["events"]) >= 1


def test_ai_observability(client: TestClient, db_session: Session, test_user: dict, analytics_project: Project, auth_headers: dict):
    db_session.add(AIRequest(
        id=str(uuid.uuid4()),
        user_id=test_user["id"],
        project_id=analytics_project.id,
        feature="test_feature",
        model="gpt-4o-mini",
        status="success",
        latency_ms=100,
        total_tokens=50
    ))
    db_session.add(AIRequest(
        id=str(uuid.uuid4()),
        user_id=test_user["id"],
        project_id=analytics_project.id,
        feature="test_feature",
        model="gpt-4o-mini",
        status="error",
        error_message="failed",
        latency_ms=50,
        total_tokens=10
    ))
    db_session.commit()
    
    res = client.get(f"/api/v1/analytics/ai-observability?project_id={analytics_project.id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_requests"] == 2
    assert data["successful_requests"] == 1
    assert data["failed_requests"] == 1
    assert data["average_latency_ms"] == 75.0
    assert data["total_tokens"] == 60
    assert len(data["features"]) == 1
    
    feat = data["features"][0]
    assert feat["feature"] == "test_feature"
    assert feat["successful_requests"] == 1
    assert feat["failed_requests"] == 1


def test_ai_evaluation_suite(db_session: Session):
    cases = [
        EvaluationCase(input_prompt="Reply with YES", expected_output="YES"),
        EvaluationCase(input_prompt="Reply with NO", expected_output="YES") # Intentional failure
    ]
    
    # Normally we don't call actual LLM in test suite without mocking,
    # but the mock in test_ai.py / conftest might be active, or we can mock get_llm_response here.
    # To keep it simple and deterministic, we'll patch get_llm_response just for this test
    import app.modules.ai.evaluation as eval_module
    from app.modules.ai.llm import LLMService
    
    class MockLLMService(LLMService):
        def generate_chat_completion(self, messages, **kwargs):
            prompt = messages[-1]["content"] if messages else ""
            if "YES" in prompt:
                return "YES", {"total_tokens": 10}, 100
            return "NO", {"total_tokens": 10}, 100
            
    original_get_llm_service = eval_module.get_llm_service
    eval_module.get_llm_service = lambda: MockLLMService(api_key="test")
    
    try:
        results = run_evaluation_suite(db_session, cases, evaluator_type="exact_match")
        assert len(results) == 2
        assert results[0].passed is True
        assert results[0].score == 100
        
        assert results[1].passed is False
        assert results[1].score == 0
    finally:
        eval_module.get_llm_service = original_get_llm_service
