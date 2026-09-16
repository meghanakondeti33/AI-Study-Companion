import json
import pytest
from unittest.mock import patch
from datetime import datetime, timezone

from app.modules.mastery.models import Concept, ConceptMastery, MasteryHistory
from app.modules.growth.models import GrowthSnapshot
from app.modules.growth.services import GrowthService, get_growth_service
from app.modules.recommendations.models import Recommendation
from app.modules.recommendations.services import RecommendationService, get_recommendation_service
from app.modules.events.models import LearningEvent


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


def create_space_and_project(client, headers, space_name="Growth Space", project_name="Growth Project"):
    space_res = client.post("/api/v1/spaces", json={"name": space_name}, headers=headers)
    space_id = space_res.json()["id"]
    proj_res = client.post(
        "/api/v1/projects",
        json={"space_id": space_id, "name": project_name},
        headers=headers,
    )
    return proj_res.json()["id"]


def seed_concept_with_mastery(db_session, project_id, user_id, concept_name, mastery_score):
    """Create a concept and seed initial mastery for it."""
    concept = Concept(project_id=project_id, name=concept_name, description=f"Description of {concept_name}")
    db_session.add(concept)
    db_session.flush()

    cm = ConceptMastery(
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        mastery_score=mastery_score,
        last_assessed_at=datetime.now(timezone.utc),
    )
    db_session.add(cm)
    db_session.commit()
    return concept


def add_mastery_history(db_session, user_id, project_id, concept_id, prev_score, new_score, source="quiz"):
    """Add a mastery history record to simulate score transitions."""
    history = MasteryHistory(
        user_id=user_id,
        project_id=project_id,
        concept_id=concept_id,
        previous_score=prev_score,
        new_score=new_score,
        source=source,
        evidence_id=f"ev_{concept_id}_{new_score}",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(history)
    db_session.commit()
    return history


# ==============================================================================
# GROWTH CLASSIFICATION TESTS
# ==============================================================================

def test_1_growth_classification_deterministic():
    """Verify the three-status deterministic classification logic."""
    # Improving: trend_delta >= 5.0
    assert GrowthService.classify_growth_status(60.0, 10.0) == "Improving"
    assert GrowthService.classify_growth_status(80.0, 5.0) == "Improving"

    # Requiring Attention: trend_delta <= -5.0
    assert GrowthService.classify_growth_status(70.0, -5.0) == "Requiring Attention"
    assert GrowthService.classify_growth_status(60.0, -10.0) == "Requiring Attention"

    # Requiring Attention: low mastery with no strong positive momentum
    assert GrowthService.classify_growth_status(30.0, 0.0) == "Requiring Attention"
    assert GrowthService.classify_growth_status(39.9, 2.0) == "Requiring Attention"

    # Stable: neither improving nor requiring attention
    assert GrowthService.classify_growth_status(60.0, 0.0) == "Stable"
    assert GrowthService.classify_growth_status(60.0, 4.9) == "Stable"
    assert GrowthService.classify_growth_status(60.0, -4.9) == "Stable"

    # No assessments => Stable
    assert GrowthService.classify_growth_status(0.0, 0.0, has_assessments=False) == "Stable"


def test_2_growth_snapshot_creation(client, db_session):
    """Verify that compute_project_growth persists an immutable GrowthSnapshot."""
    headers = register_and_login(client, "growth_snap@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    # Seed a concept with mastery
    seed_concept_with_mastery(db_session, project_id, user_id, "Algebra", 70.0)

    growth_service = get_growth_service()
    snapshot = growth_service.compute_project_growth(
        db=db_session,
        project_id=project_id,
        user_id=user_id,
        trigger_recommendations=False,
    )

    assert snapshot is not None
    assert snapshot.project_id == project_id
    assert snapshot.user_id == user_id
    assert snapshot.overall_mastery == 70.0
    assert snapshot.status in ("Improving", "Stable", "Requiring Attention")
    assert snapshot.created_at is not None

    # Verify persisted in DB
    db_snap = db_session.query(GrowthSnapshot).filter_by(id=snapshot.id).first()
    assert db_snap is not None


def test_3_growth_trend_delta_calculation(client, db_session):
    """Verify trend_delta is computed as difference from previous snapshot."""
    headers = register_and_login(client, "growth_delta@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    # Seed concept with initial mastery 50
    concept = seed_concept_with_mastery(db_session, project_id, user_id, "Physics", 50.0)
    growth_service = get_growth_service()

    # First snapshot
    snap1 = growth_service.compute_project_growth(
        db=db_session, project_id=project_id, user_id=user_id, trigger_recommendations=False,
    )
    assert snap1.overall_mastery == 50.0

    # Update mastery to 70 and create second snapshot
    cm = db_session.query(ConceptMastery).filter_by(user_id=user_id, concept_id=concept.id).first()
    cm.mastery_score = 70.0
    db_session.commit()

    snap2 = growth_service.compute_project_growth(
        db=db_session, project_id=project_id, user_id=user_id, trigger_recommendations=False,
    )
    assert snap2.overall_mastery == 70.0
    assert snap2.trend_delta == 20.0  # 70 - 50
    assert snap2.previous_overall_mastery == 50.0


def test_4_growth_classified_event_emitted(client, db_session):
    """Verify that compute_project_growth emits a 'growth_classified' learning event."""
    headers = register_and_login(client, "growth_event@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    seed_concept_with_mastery(db_session, project_id, user_id, "History", 60.0)

    growth_service = get_growth_service()
    growth_service.compute_project_growth(
        db=db_session, project_id=project_id, user_id=user_id, trigger_recommendations=False,
    )

    event = (
        db_session.query(LearningEvent)
        .filter_by(user_id=user_id, event_type="growth_classified")
        .first()
    )
    assert event is not None
    assert event.event_data["project_id"] == project_id
    assert "status" in event.event_data
    assert "overall_mastery" in event.event_data


def test_5_growth_api_overview(client, db_session):
    """Verify GET /projects/{id}/growth returns correct GrowthOverviewResponse."""
    headers = register_and_login(client, "growth_api_overview@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = seed_concept_with_mastery(db_session, project_id, user_id, "Geometry", 45.0)
    add_mastery_history(db_session, user_id, project_id, concept.id, 50.0, 45.0)

    res = client.get(f"/api/v1/projects/{project_id}/growth", headers=headers)
    assert res.status_code == 200

    data = res.json()
    assert "status" in data
    assert "overall_mastery" in data
    assert "trend_delta" in data
    assert "concept_count" in data
    assert data["concept_count"] >= 1
    assert isinstance(data["improving_concepts"], list)
    assert isinstance(data["stable_concepts"], list)
    assert isinstance(data["attention_concepts"], list)


def test_6_growth_api_history(client, db_session):
    """Verify GET /projects/{id}/growth/history returns chronological snapshots."""
    headers = register_and_login(client, "growth_api_history@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    seed_concept_with_mastery(db_session, project_id, user_id, "Chemistry", 55.0)

    growth_service = get_growth_service()
    growth_service.compute_project_growth(
        db=db_session, project_id=project_id, user_id=user_id, trigger_recommendations=False,
    )

    res = client.get(f"/api/v1/projects/{project_id}/growth/history", headers=headers)
    assert res.status_code == 200

    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "id" in data[0]
    assert "status" in data[0]
    assert "overall_mastery" in data[0]
    assert "trend_delta" in data[0]


def test_7_growth_cross_user_isolation(client, db_session):
    """Verify users cannot access other users' growth data."""
    headers_a = register_and_login(client, "growth_iso_a@example.com", "User A")
    headers_b = register_and_login(client, "growth_iso_b@example.com", "User B")

    proj_a = create_space_and_project(client, headers_a, "Space A", "Project A")

    # User B cannot view User A's growth
    res = client.get(f"/api/v1/projects/{proj_a}/growth", headers=headers_b)
    assert res.status_code == 404

    res_h = client.get(f"/api/v1/projects/{proj_a}/growth/history", headers=headers_b)
    assert res_h.status_code == 404


# ==============================================================================
# PERSONALIZED RECOMMENDATIONS TESTS
# ==============================================================================

def test_8_recommendations_generation_low_mastery(client, db_session):
    """Verify review recommendations are generated for low-mastery concepts."""
    headers = register_and_login(client, "rec_low@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = seed_concept_with_mastery(db_session, project_id, user_id, "Thermodynamics", 25.0)

    rec_service = get_recommendation_service()
    recs = rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )

    assert len(recs) >= 1
    review_recs = [r for r in recs if r.recommendation_type == "review"]
    assert len(review_recs) >= 1
    assert review_recs[0].priority == "high"
    assert review_recs[0].target_concept_id == concept.id
    assert review_recs[0].status == "active"


def test_9_recommendations_generation_declining_trend(client, db_session):
    """Verify practice recommendations are generated for declining mastery trends."""
    headers = register_and_login(client, "rec_decline@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = seed_concept_with_mastery(db_session, project_id, user_id, "Organic Chemistry", 60.0)
    add_mastery_history(db_session, user_id, project_id, concept.id, 70.0, 60.0)

    rec_service = get_recommendation_service()
    recs = rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )

    practice_recs = [r for r in recs if r.recommendation_type == "practice"]
    assert len(practice_recs) >= 1
    assert practice_recs[0].priority == "high"


def test_10_recommendations_deduplication(client, db_session):
    """Verify duplicate active recommendations are prevented."""
    headers = register_and_login(client, "rec_dedup@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    seed_concept_with_mastery(db_session, project_id, user_id, "Data Structures", 25.0)

    rec_service = get_recommendation_service()
    recs1 = rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )
    count1 = len(recs1)
    assert count1 >= 1

    # Re-run generation — should not create duplicates
    recs2 = rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )
    assert len(recs2) == 0  # No new recommendations created

    # Total active should remain the same
    total = (
        db_session.query(Recommendation)
        .filter_by(project_id=project_id, user_id=user_id, status="active")
        .count()
    )
    assert total == count1


def test_11_recommendation_complete_lifecycle(client, db_session):
    """Verify a recommendation can be marked as completed via the API."""
    headers = register_and_login(client, "rec_complete@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    seed_concept_with_mastery(db_session, project_id, user_id, "Algorithms", 35.0)

    rec_service = get_recommendation_service()
    recs = rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )
    assert len(recs) >= 1
    rec_id = recs[0].id

    # Complete via API
    res = client.post(f"/api/v1/recommendations/{rec_id}/complete", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "completed"
    assert data["recommendation"]["status"] == "completed"
    assert data["recommendation"]["completed_at"] is not None


def test_12_recommendation_dismiss_lifecycle(client, db_session):
    """Verify a recommendation can be dismissed via the API."""
    headers = register_and_login(client, "rec_dismiss@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    seed_concept_with_mastery(db_session, project_id, user_id, "Networking", 20.0)

    rec_service = get_recommendation_service()
    recs = rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )
    assert len(recs) >= 1
    rec_id = recs[0].id

    # Dismiss via API
    res = client.post(f"/api/v1/recommendations/{rec_id}/dismiss", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "dismissed"
    assert data["recommendation"]["status"] == "dismissed"


def test_13_recommendations_list_api(client, db_session):
    """Verify GET /projects/{id}/recommendations returns correct data."""
    headers = register_and_login(client, "rec_list@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    seed_concept_with_mastery(db_session, project_id, user_id, "Machine Learning", 40.0)

    rec_service = get_recommendation_service()
    rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )

    res = client.get(f"/api/v1/projects/{project_id}/recommendations", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "id" in data[0]
    assert "recommendation_type" in data[0]
    assert "title" in data[0]
    assert "priority" in data[0]
    assert "status" in data[0]
    assert data[0]["status"] == "active"


def test_14_recommendation_generated_event(client, db_session):
    """Verify 'recommendation_generated' learning events are emitted."""
    headers = register_and_login(client, "rec_event@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    seed_concept_with_mastery(db_session, project_id, user_id, "Databases", 15.0)

    rec_service = get_recommendation_service()
    rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )

    event = (
        db_session.query(LearningEvent)
        .filter_by(user_id=user_id, event_type="recommendation_generated")
        .first()
    )
    assert event is not None
    assert "recommendation_id" in event.event_data
    assert "recommendation_type" in event.event_data


def test_15_recommendations_cross_user_isolation(client, db_session):
    """Verify users cannot access other users' recommendations."""
    headers_a = register_and_login(client, "rec_iso_a@example.com", "User A")
    headers_b = register_and_login(client, "rec_iso_b@example.com", "User B")

    proj_a = create_space_and_project(client, headers_a, "Rec Space A", "Rec Project A")

    # User B cannot list User A's recommendations
    res = client.get(f"/api/v1/projects/{proj_a}/recommendations", headers=headers_b)
    assert res.status_code == 404


# ==============================================================================
# INTEGRATION TESTS: MASTERY -> GROWTH -> RECOMMENDATIONS CHAIN
# ==============================================================================

def test_16_mastery_triggers_growth_and_recommendations(client, db_session):
    """Verify that mastery_updated triggers growth recalculation which triggers recommendation generation."""
    headers = register_and_login(client, "chain_test@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = Concept(project_id=project_id, name="Calculus", description="Limits and derivatives")
    db_session.add(concept)
    db_session.commit()

    from app.modules.mastery.services import get_mastery_service
    mastery_service = get_mastery_service()

    # Record evidence with low score -> should trigger growth + recommendations
    mastery = mastery_service.record_concept_evidence(
        db=db_session,
        user_id=user_id,
        project_id=project_id,
        concept_id=concept.id,
        evidence_score=25.0,
        source="quiz",
        evidence_id="chain_ev_1",
    )

    # Verify mastery was updated
    assert mastery.mastery_score == 25.0

    # Verify growth snapshot was created
    snapshot = (
        db_session.query(GrowthSnapshot)
        .filter_by(project_id=project_id, user_id=user_id)
        .order_by(GrowthSnapshot.created_at.desc())
        .first()
    )
    assert snapshot is not None
    assert snapshot.overall_mastery == 25.0

    # Verify recommendations were generated
    recs = (
        db_session.query(Recommendation)
        .filter_by(project_id=project_id, user_id=user_id, status="active")
        .all()
    )
    assert len(recs) >= 1


def test_17_high_mastery_continue_recommendation(client, db_session):
    """Verify 'continue' recommendations are generated for high-mastery concepts."""
    headers = register_and_login(client, "rec_continue@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    concept = seed_concept_with_mastery(db_session, project_id, user_id, "Linear Algebra", 90.0)
    add_mastery_history(db_session, user_id, project_id, concept.id, 85.0, 90.0)

    rec_service = get_recommendation_service()
    recs = rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )

    continue_recs = [r for r in recs if r.recommendation_type == "continue"]
    assert len(continue_recs) >= 1
    assert continue_recs[0].priority == "low"


def test_18_cannot_complete_already_completed(client, db_session):
    """Verify that completing an already-completed recommendation returns 400."""
    headers = register_and_login(client, "rec_double_complete@example.com")
    project_id = create_space_and_project(client, headers)
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    seed_concept_with_mastery(db_session, project_id, user_id, "Topology", 20.0)

    rec_service = get_recommendation_service()
    recs = rec_service.generate_project_recommendations(
        db=db_session, project_id=project_id, user_id=user_id,
    )
    assert len(recs) >= 1
    rec_id = recs[0].id

    # First complete
    res1 = client.post(f"/api/v1/recommendations/{rec_id}/complete", headers=headers)
    assert res1.status_code == 200

    # Second complete should fail
    res2 = client.post(f"/api/v1/recommendations/{rec_id}/complete", headers=headers)
    assert res2.status_code == 400
