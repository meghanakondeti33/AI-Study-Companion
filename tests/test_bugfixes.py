import pytest
from app.modules.mastery.services import get_mastery_service
from app.modules.growth.services import get_growth_service
from app.modules.events.models import emit_learning_event
from app.database import Base
from unittest.mock import patch, MagicMock

@pytest.fixture
def test_db_session(db):
    yield db

def test_mastery_zero_overlap_question_does_not_corrupt_first_concept(db_session):
    """
    Ensures that if a question has 0 word overlap with any concept,
    it is NOT assigned to the first concept by default.
    """
    from app.modules.users.models import User
    from app.modules.spaces.models import Space
    from app.modules.projects.models import Project
    from app.modules.mastery.models import Concept, ConceptMastery, MasteryHistory
    from app.modules.assessment.models import Quiz, QuizQuestion, QuizAttempt, QuizAnswer

    # Create User & Project
    user = User(email="mastery_bug@example.com", name="Test", password_hash="pw")
    db_session.add(user)
    db_session.commit()

    space = Space(name="Mastery Space", user_id=user.id)
    db_session.add(space)
    db_session.commit()

    project = Project(name="Mastery Project", space_id=space.id, user_id=user.id)
    db_session.add(project)
    db_session.commit()

    # Create Concepts
    concept1 = Concept(project_id=project.id, name="Thermodynamics")
    concept2 = Concept(project_id=project.id, name="Calculus")
    db_session.add_all([concept1, concept2])
    db_session.commit()
    
    c1 = ConceptMastery(project_id=project.id, user_id=user.id, concept_id=concept1.id, mastery_score=50.0)
    c2 = ConceptMastery(project_id=project.id, user_id=user.id, concept_id=concept2.id, mastery_score=50.0)
    db_session.add_all([c1, c2])
    db_session.commit()

    # Create Quiz and Question with NO word overlap to concepts
    quiz = Quiz(project_id=project.id, user_id=user.id, title="Unrelated Quiz", status="COMPLETED")
    db_session.add(quiz)
    db_session.commit()

    question = QuizQuestion(quiz_id=quiz.id, question_text="What is the capital of France?", question_type="mcq", explanation="Paris", correct_answer="Paris")
    db_session.add(question)
    db_session.commit()

    # Attempt and Correct Answer
    attempt = QuizAttempt(quiz_id=quiz.id, user_id=user.id, score=100.0)
    db_session.add(attempt)
    db_session.commit()

    ans = QuizAnswer(attempt_id=attempt.id, question_id=question.id, answer_text="Paris", is_correct=True, score=1.0)
    db_session.add(ans)
    db_session.commit()

    # Process Completion
    svc = get_mastery_service()
    updated = svc.process_quiz_completion(db_session, attempt.id, user.id)

    db_session.refresh(c1)
    db_session.refresh(c2)

    # Neither concept should have been updated
    assert len(updated) == 0
    assert c1.mastery_score == 50.0
    assert c2.mastery_score == 50.0

def test_growth_initial_snapshot_is_stable(db_session):
    """
    Ensures the very first growth snapshot correctly calculates trend_delta = 0.0
    and status = "Stable", rather than falsely indicating "Improving" based on overall_mastery.
    """
    from app.modules.users.models import User
    from app.modules.spaces.models import Space
    from app.modules.projects.models import Project
    from app.modules.mastery.models import Concept, ConceptMastery
    from app.modules.growth.models import GrowthSnapshot

    user = User(email="growth_bug@example.com", name="Test", password_hash="pw")
    db_session.add(user)
    db_session.commit()

    space = Space(name="Growth Space", user_id=user.id)
    db_session.add(space)
    db_session.commit()

    project = Project(name="Growth Project", space_id=space.id, user_id=user.id)
    db_session.add(project)
    db_session.commit()

    concept_a = Concept(project_id=project.id, name="Concept A")
    db_session.add(concept_a)
    db_session.commit()

    c1 = ConceptMastery(project_id=project.id, user_id=user.id, concept_id=concept_a.id, mastery_score=60.0)
    db_session.add(c1)
    db_session.commit()

    svc = get_growth_service()
    
    # 1st snapshot
    svc.compute_project_growth(db_session, project.id, user.id)
    
    snap1 = db_session.query(GrowthSnapshot).filter_by(project_id=project.id, user_id=user.id).first()
    assert snap1 is not None
    assert snap1.overall_mastery == 60.0
    assert snap1.previous_overall_mastery is None
    assert snap1.trend_delta == 0.0
    assert snap1.status == "Stable"

@patch("app.modules.learner_context.tasks.async_refresh_learner_context.delay")
@patch("threading.Thread")
def test_emit_learning_event_respects_celery_config(mock_thread, mock_delay, db_session):
    """
    Ensures emit_learning_event routes to Celery if USE_CELERY=True,
    and a local Thread if USE_CELERY=False.
    """
    from app.modules.users.models import User
    
    user = User(email="events_bug@example.com", name="Test", password_hash="pw")
    db_session.add(user)
    db_session.commit()

    from app.config import settings
    
    # Test USE_CELERY = True
    settings.USE_CELERY = True
    emit_learning_event(db_session, user.id, "test_event_1", idempotency_key="ev1")
    mock_delay.assert_called_once_with(user.id)
    mock_thread.assert_not_called()

    # Reset mocks
    mock_delay.reset_mock()
    mock_thread.reset_mock()

    # Test USE_CELERY = False
    settings.USE_CELERY = False
    emit_learning_event(db_session, user.id, "test_event_2", idempotency_key="ev2")
    mock_delay.assert_not_called()
    mock_thread.assert_called_once()
    
    # Restore settings for other tests
    settings.USE_CELERY = True
