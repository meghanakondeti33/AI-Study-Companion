import json
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from app.modules.materials.models import Material, MaterialPage, MaterialChunk, MaterialStatus
from app.modules.assessment.models import Quiz, QuizQuestion, QuizAttempt, QuizAnswer
from app.modules.mastery.models import Concept, ConceptMastery, MasteryHistory
from app.modules.mastery.services import MasteryService, get_mastery_service
from app.modules.mastery.schemas import ConceptExtractionResponse, ConceptExtractionItem, TutorEvidenceSignal
from app.modules.events.models import LearningEvent
from app.modules.tutor.models import TutorConversation, TutorMessage


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


def create_space_and_project(client, headers, space_name="Mastery Space", project_name="Mastery Project"):
    space_res = client.post("/api/v1/spaces", json={"name": space_name}, headers=headers)
    space_id = space_res.json()["id"]
    proj_res = client.post(
        "/api/v1/projects",
        json={"space_id": space_id, "name": project_name},
        headers=headers,
    )
    return proj_res.json()["id"]


def add_ready_material_with_chunks(db_session, project_id: str, page_number: int = 1):
    material = Material(
        project_id=project_id,
        filename="biology.pdf",
        original_filename="biology.pdf",
        file_type="application/pdf",
        file_size=2048,
        storage_key=f"materials/{project_id}/biology.pdf",
        status=MaterialStatus.READY,
        page_count=2,
    )
    db_session.add(material)
    db_session.flush()

    chunk = MaterialChunk(
        material_id=material.id,
        project_id=project_id,
        page_number=page_number,
        chunk_index=0,
        content="Photosynthesis converts solar energy into chemical energy. Cellular respiration produces ATP in mitochondria.",
        embedding=[0.05] * 1536,
    )
    db_session.add(chunk)
    db_session.commit()
    return material, chunk


# ==============================================================================
# PHASE 5 TESTS
# ==============================================================================

def test_1_deterministic_mastery_formula():
    """Verify exact deterministic mastery update formula, rounding, and boundaries."""
    # Example from spec: old = 50, evidence = 80 -> 50 * 0.7 + 80 * 0.3 = 59.0
    new_score = MasteryService.calculate_new_mastery(old_score=50.0, evidence_score=80.0)
    assert new_score == 59.0

    # Initial assessment without previous score
    initial_score = MasteryService.calculate_new_mastery(old_score=None, evidence_score=80.0)
    assert initial_score == 80.0

    # Score cannot exceed 100 (e.g. extreme values clamped to 100.0)
    capped_score = MasteryService.calculate_new_mastery(old_score=100.0, evidence_score=100.0)
    assert capped_score == 100.0
    overflow_score = MasteryService.calculate_new_mastery(old_score=110.0, evidence_score=150.0)
    assert overflow_score == 100.0

    # Score cannot go below 0
    clamped_score = MasteryService.calculate_new_mastery(old_score=0.0, evidence_score=-50.0)
    assert clamped_score == 0.0

    # Repeated assessments test
    step1 = MasteryService.calculate_new_mastery(old_score=59.0, evidence_score=100.0)
    # 59.0 * 0.7 + 100.0 * 0.3 = 41.3 + 30.0 = 71.3
    assert step1 == 71.3


def test_2_concept_creation_and_extraction(client, db_session):
    """Verify AI concept extraction creates structured, grounded concepts in project."""
    headers = register_and_login(client, "concept_extractor@example.com")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    mock_concepts_response = {
        "concepts": [
            {
                "name": "Photosynthesis",
                "description": "Process by which plants convert sunlight into chemical energy.",
            },
            {
                "name": "Cellular Respiration",
                "description": "Biochemical pathway that breaks down glucose into ATP in mitochondria.",
            },
        ]
    }

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion") as mock_llm:
        mock_llm.return_value = (json.dumps(mock_concepts_response), {"prompt_tokens": 100, "completion_tokens": 50}, 150)

        mastery_service = get_mastery_service()
        concepts = mastery_service.extract_project_concepts(db=db_session, project_id=project_id)

        assert len(concepts) == 2
        names = [c.name for c in concepts]
        assert "Photosynthesis" in names
        assert "Cellular Respiration" in names
        assert concepts[0].project_id == project_id
        assert concepts[0].created_at is not None


def test_3_duplicate_concept_handling(client, db_session):
    """Verify duplicate concept names are prevented or deduplicated per project."""
    headers = register_and_login(client, "dedup_tester@example.com")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    # Initial concept
    c1 = Concept(project_id=project_id, name="Photosynthesis", description="Original")
    db_session.add(c1)
    db_session.commit()

    # Attempt to extract the same concept again (different case)
    mock_duplicate_response = {
        "concepts": [
            {"name": "photosynthesis", "description": "Duplicate lowercase"},
            {"name": "Glycolysis", "description": "New topic"},
        ]
    }

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion") as mock_llm:
        mock_llm.return_value = (json.dumps(mock_duplicate_response), {"prompt_tokens": 50, "completion_tokens": 30}, 120)
        mastery_service = get_mastery_service()
        concepts = mastery_service.extract_project_concepts(db=db_session, project_id=project_id)

        # Should only have 2 unique concepts: Photosynthesis and Glycolysis
        assert len(concepts) == 2
        names = [c.name.lower() for c in concepts]
        assert names.count("photosynthesis") == 1
        assert "glycolysis" in names


def test_4_mastery_record_creation_and_boundaries(client, db_session):
    """Verify ConceptMastery records respect 0-100 boundaries and unique constraints."""
    headers = register_and_login(client, "mastery_record@example.com")
    project_id = create_space_and_project(client, headers)

    user = client.get("/api/v1/auth/me", headers=headers).json()
    user_id = user["id"]

    concept = Concept(project_id=project_id, name="Thermodynamics", description="Heat and energy transfer")
    db_session.add(concept)
    db_session.commit()

    mastery_service = get_mastery_service()
    mastery = mastery_service.record_concept_evidence(
        db=db_session,
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        evidence_score=85.0,
        source="quiz",
        evidence_id="test_ev_1",
    )

    assert mastery.user_id == user_id
    assert mastery.concept_id == concept.id
    assert mastery.mastery_score == 85.0
    assert 0.0 <= mastery.mastery_score <= 100.0

    # Subsequent update with formula
    mastery_updated = mastery_service.record_concept_evidence(
        db=db_session,
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        evidence_score=50.0,
        source="quiz",
        evidence_id="test_ev_2",
    )
    # 85.0 * 0.7 + 50.0 * 0.3 = 59.5 + 15.0 = 74.5
    assert mastery_updated.mastery_score == 74.5


def test_5_quiz_completion_updates_mastery(client, db_session):
    """Verify quiz completion updates concept mastery, records history, and emits mastery_updated."""
    headers = register_and_login(client, "quiz_mastery@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    # Pre-create project concept
    concept = Concept(project_id=project_id, name="Photosynthesis", description="Sunlight to chemical energy")
    db_session.add(concept)
    db_session.commit()

    # Pre-set baseline mastery to 50.0
    cm = ConceptMastery(
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        mastery_score=50.0,
        last_assessed_at=datetime.now(timezone.utc),
    )
    db_session.add(cm)
    db_session.commit()

    # Create a quiz with a question matching "Photosynthesis"
    quiz = Quiz(project_id=project_id, user_id=user_id, title="Bio Quiz", status="READY")
    db_session.add(quiz)
    db_session.flush()

    q1 = QuizQuestion(
        quiz_id=quiz.id,
        question_type="mcq",
        question_text="What is the primary product of photosynthesis?",
        options=["Glucose", "Carbon Dioxide", "Nitrogen", "Salt"],
        correct_answer="Glucose",
        explanation="Photosynthesis produces glucose from sunlight.",
        difficulty="medium",
    )
    db_session.add(q1)
    db_session.commit()

    # Start attempt
    start_res = client.post(f"/api/v1/quizzes/{quiz.id}/attempts", headers=headers)
    assert start_res.status_code == 201
    attempt_id = start_res.json()["id"]

    # Verify concept mastery has NOT changed before quiz completion
    check_before = db_session.query(ConceptMastery).filter_by(user_id=user_id, concept_id=concept.id).first()
    assert check_before.mastery_score == 50.0

    # Submit correct MCQ answer (score = 1.0 -> evidence = 100.0)
    ans_res = client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"question_id": q1.id, "answer_text": "Glucose"},
        headers=headers,
    )
    assert ans_res.status_code == 201

    # Complete attempt
    complete_res = client.post(f"/api/v1/attempts/{attempt_id}/complete", headers=headers)
    assert complete_res.status_code == 200

    # Mastery should now be updated: 50.0 * 0.7 + 100.0 * 0.3 = 35.0 + 30.0 = 65.0
    check_after = db_session.query(ConceptMastery).filter_by(user_id=user_id, concept_id=concept.id).first()
    assert check_after.mastery_score == 65.0

    # Verify MasteryHistory record created
    history = db_session.query(MasteryHistory).filter_by(user_id=user_id, concept_id=concept.id).first()
    assert history is not None
    assert history.previous_score == 50.0
    assert history.new_score == 65.0
    assert history.source == "quiz"

    # Verify mastery_updated learning event emitted
    event = (
        db_session.query(LearningEvent)
        .filter_by(user_id=user_id, event_type="mastery_updated")
        .first()
    )
    assert event is not None
    assert event.event_data["concept_id"] == concept.id
    assert event.event_data["new_score"] == 65.0


def test_6_open_ended_evaluation_updates_mastery(client, db_session):
    """Verify open-ended questions update mastery through MasteryService without direct LLM writes."""
    headers = register_and_login(client, "oe_mastery@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = Concept(project_id=project_id, name="Cellular Respiration", description="ATP synthesis pathway")
    db_session.add(concept)
    db_session.commit()

    # Pre-set baseline mastery = 50.0
    cm = ConceptMastery(
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        mastery_score=50.0,
        last_assessed_at=datetime.now(timezone.utc),
    )
    db_session.add(cm)
    db_session.commit()

    quiz = Quiz(project_id=project_id, user_id=user_id, title="Respiration Quiz", status="READY")
    db_session.add(quiz)
    db_session.flush()

    q_oe = QuizQuestion(
        quiz_id=quiz.id,
        question_type="open_ended",
        question_text="Explain cellular respiration and how ATP is generated.",
        correct_answer="Mitochondria use glucose and oxygen to generate ATP via the electron transport chain.",
        explanation="Cellular respiration yields cellular energy in the form of ATP.",
        difficulty="hard",
    )
    db_session.add(q_oe)
    db_session.commit()

    start_res = client.post(f"/api/v1/quizzes/{quiz.id}/attempts", headers=headers)
    assert start_res.status_code == 201
    attempt_id = start_res.json()["id"]

    # Mock AI open-ended evaluation returning score=0.8 (80%)
    mock_eval = {
        "score": 0.8,
        "is_correct": True,
        "feedback": "Strong explanation of ATP generation in mitochondria.",
        "strengths": ["Clear role of electron transport chain"],
        "gaps": [],
        "improvement_hint": "Review the electron transport chain details.",
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion") as mock_llm:
        mock_llm.return_value = (json.dumps(mock_eval), {"prompt_tokens": 100, "completion_tokens": 50}, 150)
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            ans_res = client.post(
                f"/api/v1/attempts/{attempt_id}/answers",
                json={"question_id": q_oe.id, "answer_text": "Mitochondria convert oxygen and glucose to ATP."},
                headers=headers,
            )
            assert ans_res.status_code == 201

    # Complete attempt
    client.post(f"/api/v1/attempts/{attempt_id}/complete", headers=headers)

    # Expected: 50.0 * 0.7 + (0.8 * 100.0) * 0.3 = 35.0 + 24.0 = 59.0!
    updated_cm = db_session.query(ConceptMastery).filter_by(user_id=user_id, concept_id=concept.id).first()
    assert updated_cm.mastery_score == 59.0


def test_7_tutor_evidence_handling(client, db_session):
    """Verify tutor interactions only update mastery when genuine learning signal is classified."""
    headers = register_and_login(client, "tutor_mastery@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = Concept(project_id=project_id, name="Photosynthesis", description="Light dependent reaction")
    db_session.add(concept)
    db_session.commit()

    mastery_service = get_mastery_service()

    # 1. Passive question ("What is photosynthesis?") -> No signal, no update
    res_passive = mastery_service.process_tutor_interaction(
        db=db_session,
        user_id=user_id,
        project_id=project_id,
        user_message_id="msg_passive_1",
        user_message="What is photosynthesis?",
        tutor_response="Photosynthesis is the process...",
        is_grounded=True,
    )
    assert res_passive is None

    # 2. Grounded refusal -> No update
    res_refusal = mastery_service.process_tutor_interaction(
        db=db_session,
        user_id=user_id,
        project_id=project_id,
        user_message_id="msg_refusal_1",
        user_message="Tell me how nuclear fusion works in the sun.",
        tutor_response="I could not find information in your project materials.",
        is_grounded=False,
    )
    assert res_refusal is None

    # 3. Active substantive reasoning with AI signal
    mock_signal = {
        "has_learning_signal": True,
        "relevant_concept_names": ["Photosynthesis"],
        "understanding_score": 0.85,
        "rationale": "Learner correctly explained electron transport in thylakoids.",
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion") as mock_llm:
        mock_llm.return_value = (json.dumps(mock_signal), {"prompt_tokens": 80, "completion_tokens": 40}, 100)

        res_active = mastery_service.process_tutor_interaction(
            db=db_session,
            user_id=user_id,
            project_id=project_id,
            user_message_id="msg_active_1",
            user_message="In photosynthesis, chlorophyll in thylakoids absorbs photons to excite electrons and generate NADPH.",
            tutor_response="Exactly right! That summarizes the light reactions.",
            is_grounded=True,
        )

        assert res_active is not None
        assert res_active.mastery_score == 85.0

        # Check history source is "tutor"
        history = db_session.query(MasteryHistory).filter_by(evidence_id="tutor_msg_msg_active_1").first()
        assert history is not None
        assert history.source == "tutor"


def test_8_mastery_history_immutability_and_idempotency(client, db_session):
    """Verify mastery history preserves an immutable audit trail and avoids double-counting duplicate events."""
    headers = register_and_login(client, "idempotency_tester@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = Concept(project_id=project_id, name="Calculus", description="Derivatives and Integrals")
    db_session.add(concept)
    db_session.commit()

    mastery_service = get_mastery_service()

    # First event
    ev1 = mastery_service.record_concept_evidence(
        db=db_session,
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        evidence_score=80.0,
        source="quiz",
        evidence_id="event_xyz_123",
    )
    assert ev1.mastery_score == 80.0

    # Repeat exact same event (idempotency guard)
    ev2 = mastery_service.record_concept_evidence(
        db=db_session,
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        evidence_score=80.0,
        source="quiz",
        evidence_id="event_xyz_123",
    )
    assert ev2.mastery_score == 80.0

    # Should only have 1 history record
    history_count = (
        db_session.query(MasteryHistory)
        .filter_by(user_id=user_id, evidence_id="event_xyz_123")
        .count()
    )
    assert history_count == 1


def test_9_cross_user_and_cross_project_isolation(client, db_session):
    """Verify users cannot access or tamper with other users' concepts or mastery data."""
    headers_a = register_and_login(client, "user_a@example.com", "User A")
    headers_b = register_and_login(client, "user_b@example.com", "User B")

    proj_a = create_space_and_project(client, headers_a, "Space A", "Project A")
    proj_b = create_space_and_project(client, headers_b, "Space B", "Project B")

    c_a = Concept(project_id=proj_a, name="Quantum Mechanics", description="Wave functions")
    db_session.add(c_a)
    db_session.commit()

    # User B cannot list User A's concepts
    res_b_access_a = client.get(f"/api/v1/projects/{proj_a}/concepts", headers=headers_b)
    assert res_b_access_a.status_code == 404

    # User B cannot view User A's mastery
    res_b_mastery = client.get(f"/api/v1/projects/{proj_a}/mastery", headers=headers_b)
    assert res_b_mastery.status_code == 404

    # User B cannot view User A's concept mastery
    res_b_concept = client.get(f"/api/v1/concepts/{c_a.id}/mastery", headers=headers_b)
    assert res_b_concept.status_code == 404

    # User B cannot view User A's mastery history
    res_b_history = client.get(f"/api/v1/projects/{proj_a}/mastery/history", headers=headers_b)
    assert res_b_history.status_code == 404


def test_10_mastery_api_endpoints(client, db_session):
    """Verify all four required Phase 5 API endpoints return correct schemas and data."""
    headers = register_and_login(client, "api_tester@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = Concept(project_id=project_id, name="Computer Networks", description="OSI Model & TCP/IP")
    db_session.add(concept)
    db_session.commit()

    # 1. GET /projects/{project_id}/concepts
    concepts_res = client.get(f"/api/v1/projects/{project_id}/concepts", headers=headers)
    assert concepts_res.status_code == 200
    concepts_list = concepts_res.json()
    assert len(concepts_list) >= 1
    assert concepts_list[0]["name"] == "Computer Networks"

    # Add mastery record
    mastery_service = get_mastery_service()
    mastery_service.record_concept_evidence(
        db=db_session,
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        evidence_score=90.0,
        source="quiz",
        evidence_id="api_ev_1",
    )

    # 2. GET /projects/{project_id}/mastery
    mastery_res = client.get(f"/api/v1/projects/{project_id}/mastery", headers=headers)
    assert mastery_res.status_code == 200
    mastery_list = mastery_res.json()
    assert len(mastery_list) == 1
    assert mastery_list[0]["concept_name"] == "Computer Networks"
    assert mastery_list[0]["mastery_score"] == 90.0

    # 3. GET /projects/{project_id}/mastery/history
    history_res = client.get(f"/api/v1/projects/{project_id}/mastery/history", headers=headers)
    assert history_res.status_code == 200
    history_list = history_res.json()
    assert len(history_list) == 1
    assert history_list[0]["source"] == "quiz"
    assert history_list[0]["new_score"] == 90.0

    # 4. GET /concepts/{concept_id}/mastery
    single_res = client.get(f"/api/v1/concepts/{concept.id}/mastery", headers=headers)
    assert single_res.status_code == 200
    assert single_res.json()["concept_id"] == concept.id
    assert single_res.json()["mastery_score"] == 90.0
