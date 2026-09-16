import json
import pytest
from unittest.mock import patch, MagicMock
from pydantic import ValidationError

from app.modules.materials.models import Material, MaterialPage, MaterialChunk, MaterialStatus
from app.modules.assessment.models import Quiz, QuizQuestion, QuizAttempt, QuizAnswer
from app.modules.assessment.schemas import (
    QuizGenerationAIResponse,
    GeneratedQuestionItem,
    OpenEndedEvaluation,
)
from app.modules.events.models import LearningEvent
from app.modules.ai.models import AIRequest
from app.modules.retrieval.services import RetrievedChunk
from app.modules.ai.llm import LLMServiceError


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


def create_space_and_project(client, headers, space_name="Test Space", project_name="Test Project"):
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
        filename="biology_chapter.pdf",
        original_filename="biology_chapter.pdf",
        file_type="application/pdf",
        file_size=2048,
        storage_key=f"materials/{project_id}/sample.pdf",
        status=MaterialStatus.READY,
        page_count=2,
    )
    db_session.add(material)
    db_session.flush()

    page = MaterialPage(
        material_id=material.id,
        page_number=page_number,
        text="Photosynthesis occurs in chloroplasts. Mitochondria generate ATP through cellular respiration.",
    )
    db_session.add(page)
    db_session.flush()

    chunk = MaterialChunk(
        material_id=material.id,
        project_id=project_id,
        page_number=page_number,
        chunk_index=0,
        content="Photosynthesis occurs in chloroplasts. Mitochondria generate ATP through cellular respiration.",
        embedding=[0.05] * 1536,
    )
    db_session.add(chunk)
    db_session.commit()
    return material, chunk


# ==============================================================================
# PHASE 4 TESTS
# ==============================================================================

def test_1_quiz_creation(client, db_session):
    """Verify grounded quiz generation creates Quiz and QuizQuestion records."""
    headers = register_and_login(client, "quiz_maker@example.com", "Quiz Maker")
    project_id = create_space_and_project(client, headers)
    material, chunk = add_ready_material_with_chunks(db_session, project_id, page_number=1)

    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "mcq",
                "question_text": "Which organelle is responsible for generating cellular ATP?",
                "options": ["Mitochondria", "Chloroplast", "Ribosome", "Endoplasmic Reticulum"],
                "correct_answer": "Mitochondria",
                "explanation": "Mitochondria generate ATP via cellular respiration.",
                "difficulty": "medium",
                "page_number": 1,
            },
            {
                "question_type": "open_ended",
                "question_text": "Explain how photosynthesis functions within plant cells.",
                "options": None,
                "correct_answer": "Occurs in chloroplasts to synthesize organic compounds from light.",
                "explanation": "Chloroplasts capture photons to convert carbon dioxide and water into glucose.",
                "difficulty": "medium",
                "page_number": 1,
            },
        ]
    }

    mock_llm_response = (
        json.dumps(mock_quiz_payload),
        {"prompt_tokens": 150, "completion_tokens": 80},
        180,
    )

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=mock_llm_response):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            res = client.post(
                f"/api/v1/projects/{project_id}/quizzes",
                json={"num_questions": 2, "difficulty": "medium", "title": "Bio Quiz 1"},
                headers=headers,
            )
            assert res.status_code == 201
            data = res.json()
            assert data["title"] == "Bio Quiz 1"
            assert data["project_id"] == project_id
            assert data["status"] == "READY"
            assert len(data["questions"]) == 2

            types = [q["question_type"] for q in data["questions"]]
            assert "mcq" in types
            assert "open_ended" in types

            mcq_q = next(q for q in data["questions"] if q["question_type"] == "mcq")
            assert len(mcq_q["options"]) == 4
            assert mcq_q["source_citations"][0]["page_number"] == 1



def test_2_project_ownership(client, db_session):
    """Verify that a user cannot generate or list quizzes in another user's project."""
    alice_headers = register_and_login(client, "alice_quiz@example.com", "Alice")
    bob_headers = register_and_login(client, "bob_quiz@example.com", "Bob")

    alice_proj = create_space_and_project(client, alice_headers, "Alice Space", "Alice Project")
    add_ready_material_with_chunks(db_session, alice_proj)

    # Bob tries to generate quiz in Alice's project -> 404
    bob_gen = client.post(
        f"/api/v1/projects/{alice_proj}/quizzes",
        json={"num_questions": 2, "difficulty": "easy"},
        headers=bob_headers,
    )
    assert bob_gen.status_code == 404

    # Bob tries to list Alice's quizzes -> 404
    bob_list = client.get(f"/api/v1/projects/{alice_proj}/quizzes", headers=bob_headers)
    assert bob_list.status_code == 404


def test_3_cross_user_quiz_access_rejected(client, db_session):
    """Verify that user cannot retrieve or start attempts on another user's quiz."""
    alice_headers = register_and_login(client, "alice_iso@example.com", "Alice")
    bob_headers = register_and_login(client, "bob_iso@example.com", "Bob")

    alice_proj = create_space_and_project(client, alice_headers, "Alice Space", "Alice Project")
    add_ready_material_with_chunks(db_session, alice_proj)

    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "mcq",
                "question_text": "Sample question text?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "explanation": "Explanation here",
                "difficulty": "easy",
                "page_number": 1,
            }
        ]
    }
    mock_llm_response = (json.dumps(mock_quiz_payload), {"prompt_tokens": 50, "completion_tokens": 20}, 100)

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=mock_llm_response):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            create_res = client.post(
                f"/api/v1/projects/{alice_proj}/quizzes",
                json={"num_questions": 1, "difficulty": "easy"},
                headers=alice_headers,
            )
            quiz_id = create_res.json()["id"]

    # Bob tries to GET Alice's quiz -> 404
    bob_get = client.get(f"/api/v1/quizzes/{quiz_id}", headers=bob_headers)
    assert bob_get.status_code == 404

    # Bob tries to POST an attempt on Alice's quiz -> 404
    bob_attempt = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=bob_headers)
    assert bob_attempt.status_code == 404


def test_4_quiz_grounded_in_project_material(client, db_session):
    """Verify that hallucinated page numbers from LLM are clamped to valid project pages."""
    headers = register_and_login(client, "grounding_user@example.com", "Grounding User")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id, page_number=2)

    # LLM hallucinates page 999
    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "mcq",
                "question_text": "Grounding verification question?",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "correct_answer": "Option 1",
                "explanation": "Page verification explanation",
                "difficulty": "medium",
                "page_number": 999,  # Hallucinated page number!
            }
        ]
    }
    mock_llm_response = (json.dumps(mock_quiz_payload), {"prompt_tokens": 60, "completion_tokens": 30}, 120)

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=mock_llm_response):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            res = client.post(
                f"/api/v1/projects/{project_id}/quizzes",
                json={"num_questions": 1},
                headers=headers,
            )
            assert res.status_code == 201
            data = res.json()
            # Verified that hallucinated page 999 was safely replaced with valid project page 2
            citations = data["questions"][0]["source_citations"]
            assert len(citations) == 1
            assert citations[0]["page_number"] == 2


def test_5_generated_question_schema_validation():
    """Verify Pydantic schemas correctly validate structured AI question output."""
    valid_payload = {
        "questions": [
            {
                "question_type": "mcq",
                "question_text": "What is DNA?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "explanation": "Deoxyribonucleic acid",
                "difficulty": "medium",
                "page_number": 1,
            }
        ]
    }
    parsed = QuizGenerationAIResponse.model_validate(valid_payload)
    assert len(parsed.questions) == 1
    assert parsed.questions[0].question_type == "mcq"

    # Invalid question type
    invalid_type = {
        "questions": [
            {
                "question_type": "true_false",  # Not supported
                "question_text": "Valid question text?",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": "Explanation",
                "page_number": 1,
            }
        ]
    }
    with pytest.raises(ValidationError):
        QuizGenerationAIResponse.model_validate(invalid_type)


def test_6_invalid_ai_quiz_response_handled_safely(client, db_session):
    """Verify that invalid/malformed LLM responses retry and return controlled 502 without stack traces."""
    headers = register_and_login(client, "malformed_llm@example.com", "Malformed LLM")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    # LLM returns invalid non-JSON string
    bad_llm_response = ("Sorry, I cannot generate a quiz at this time.", {"prompt_tokens": 10, "completion_tokens": 10}, 80)

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=bad_llm_response):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            res = client.post(
                f"/api/v1/projects/{project_id}/quizzes",
                json={"num_questions": 2},
                headers=headers,
            )
            assert res.status_code == 502
            data = res.json()
            assert "Failed to generate quiz from AI service" in data["detail"]
            # Ensure no internal traceback is exposed
            assert "Traceback" not in str(data)


def test_7_mcq_evaluation(client, db_session):
    """Verify deterministic MCQ grading without LLM: exact match gives 1.0, incorrect gives 0.0."""
    headers = register_and_login(client, "mcq_tester@example.com", "MCQ Tester")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "mcq",
                "question_text": "Which organelle generates ATP?",
                "options": ["Mitochondria", "Nucleus", "Ribosome", "Vacuole"],
                "correct_answer": "Mitochondria",
                "explanation": "Mitochondria produce ATP via respiration.",
                "difficulty": "easy",
                "page_number": 1,
            }
        ]
    }
    mock_llm_response = (json.dumps(mock_quiz_payload), {"prompt_tokens": 40, "completion_tokens": 20}, 90)

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=mock_llm_response):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            quiz_res = client.post(
                f"/api/v1/projects/{project_id}/quizzes",
                json={"num_questions": 1},
                headers=headers,
            )
            quiz_id = quiz_res.json()["id"]
            question_id = quiz_res.json()["questions"][0]["id"]

    # Start attempt
    attempt_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=headers)
    assert attempt_res.status_code == 201
    attempt_id = attempt_res.json()["id"]

    # Submit Correct Answer (case insensitive, trimmed)
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion") as mock_eval_llm:
        correct_sub = client.post(
            f"/api/v1/attempts/{attempt_id}/answers",
            json={"question_id": question_id, "answer_text": "  mitochondria  "},
            headers=headers,
        )
        assert correct_sub.status_code == 201
        ans_data = correct_sub.json()
        assert ans_data["is_correct"] is True
        assert ans_data["score"] == 1.0
        assert ans_data["evaluated_by"] == "system"
        assert "Correct!" in ans_data["feedback"]
        # Crucial requirement: MCQ evaluated WITHOUT calling LLM
        mock_eval_llm.assert_not_called()

    # Start a second attempt to test incorrect answer
    attempt2_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=headers)
    attempt2_id = attempt2_res.json()["id"]

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion") as mock_eval_llm:
        wrong_sub = client.post(
            f"/api/v1/attempts/{attempt2_id}/answers",
            json={"question_id": question_id, "answer_text": "Nucleus"},
            headers=headers,
        )
        assert wrong_sub.status_code == 201
        ans_data = wrong_sub.json()
        assert ans_data["is_correct"] is False
        assert ans_data["score"] == 0.0
        assert ans_data["evaluated_by"] == "system"
        assert "Incorrect" in ans_data["feedback"]
        mock_eval_llm.assert_not_called()


def test_8_open_ended_evaluation(client, db_session):
    """Verify open-ended questions are evaluated by AI with structured feedback, strengths, and gaps."""
    headers = register_and_login(client, "open_ended@example.com", "Open Ended")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "open_ended",
                "question_text": "Describe the function of chloroplasts in plant cells.",
                "options": None,
                "correct_answer": "Chloroplasts conduct photosynthesis by capturing light to produce glucose.",
                "explanation": "They contain chlorophyll to absorb solar radiation.",
                "difficulty": "medium",
                "page_number": 1,
            }
        ]
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=(json.dumps(mock_quiz_payload), {}, 100)):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            quiz_res = client.post(
                f"/api/v1/projects/{project_id}/quizzes",
                json={"num_questions": 1},
                headers=headers,
            )
            quiz_id = quiz_res.json()["id"]
            question_id = quiz_res.json()["questions"][0]["id"]

    # Start attempt
    attempt_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=headers)
    attempt_id = attempt_res.json()["id"]

    # Mock Open-Ended Evaluation
    eval_ai_response = {
        "score": 0.85,
        "is_correct": True,
        "feedback": "Strong understanding of chloroplast energy capture with clear reference to photosynthesis.",
        "strengths": ["Mentioned photosynthesis", "Identified photon absorption"],
        "gaps": ["Did not mention glucose production explicitly"],
        "improvement_hint": "Review the chemical outputs of the Calvin cycle.",
    }
    mock_eval_tuple = (json.dumps(eval_ai_response), {"prompt_tokens": 80, "completion_tokens": 45}, 140)

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=mock_eval_tuple):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            ans_res = client.post(
                f"/api/v1/attempts/{attempt_id}/answers",
                json={
                    "question_id": question_id,
                    "answer_text": "Chloroplasts absorb photons from the sun to power the photosynthesis reaction.",
                },
                headers=headers,
            )
            assert ans_res.status_code == 201
            data = ans_res.json()
            assert data["is_correct"] is True
            assert data["score"] == 0.85
            assert data["evaluated_by"] == "ai"
            assert "Strong understanding" in data["feedback"]
            assert "Mentioned photosynthesis" in data["evaluation_details"]["strengths"]
            assert "Did not mention glucose production explicitly" in data["evaluation_details"]["gaps"]
            assert "Calvin cycle" in data["evaluation_details"]["improvement_hint"]


def test_9_malformed_open_ended_ai_response(client, db_session):
    """Verify that open-ended evaluation gracefully falls back when AI output is malformed."""
    headers = register_and_login(client, "fallback_eval@example.com", "Fallback Eval")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "open_ended",
                "question_text": "Explain cellular respiration.",
                "options": None,
                "correct_answer": "Catabolic pathway producing ATP.",
                "explanation": "Mitochondria convert nutrients to energy.",
                "difficulty": "medium",
                "page_number": 1,
            }
        ]
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=(json.dumps(mock_quiz_payload), {}, 100)):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            quiz_res = client.post(f"/api/v1/projects/{project_id}/quizzes", json={"num_questions": 1}, headers=headers)
            quiz_id = quiz_res.json()["id"]
            question_id = quiz_res.json()["questions"][0]["id"]

    attempt_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=headers)
    attempt_id = attempt_res.json()["id"]

    # AI returns non-JSON or raises error
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", side_effect=LLMServiceError("Service unavailable")):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            ans_res = client.post(
                f"/api/v1/attempts/{attempt_id}/answers",
                json={"question_id": question_id, "answer_text": "It breaks down glucose to make ATP."},
                headers=headers,
            )
            assert ans_res.status_code == 201
            data = ans_res.json()
            assert data["evaluated_by"] == "ai"
            assert data["score"] == 0.5
            assert "temporarily unavailable" in data["feedback"]


def test_10_adaptive_generation_uses_previous_mistakes(client, db_session):
    """Verify that previous incorrect quiz answers are provided to LLM to adapt future questions."""
    headers = register_and_login(client, "adaptive_student@example.com", "Adaptive Student")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    # 1. Create and complete an initial quiz with an incorrect answer
    initial_quiz = Quiz(
        project_id=project_id,
        user_id=db_session.query(Quiz).first().user_id if db_session.query(Quiz).count() > 0 else "placeholder",
        title="Initial Quiz",
        status="READY",
    )
    # Get user_id from token/db
    from app.modules.users.models import User
    user = db_session.query(User).filter(User.email == "adaptive_student@example.com").first()
    initial_quiz.user_id = user.id
    db_session.add(initial_quiz)
    db_session.flush()

    q1 = QuizQuestion(
        quiz_id=initial_quiz.id,
        question_type="mcq",
        question_text="What is the role of ribosomes in the cell?",
        options=["Protein synthesis", "Lipid synthesis", "ATP production", "DNA replication"],
        correct_answer="Protein synthesis",
        explanation="Ribosomes translate mRNA into polypeptide chains for protein synthesis.",
        difficulty="hard",
        source_citations=[{"material_id": "mat-1", "page_number": 1}],
    )
    db_session.add(q1)
    db_session.flush()

    attempt = QuizAttempt(quiz_id=initial_quiz.id, user_id=user.id)
    db_session.add(attempt)
    db_session.flush()

    wrong_ans = QuizAnswer(
        attempt_id=attempt.id,
        question_id=q1.id,
        answer_text="Lipid synthesis",
        is_correct=False,
        score=0.0,
        feedback="Incorrect.",
        evaluated_by="system",
    )
    db_session.add(wrong_ans)
    db_session.commit()

    # 2. Trigger generation of next adaptive quiz and inspect messages sent to LLM
    captured_messages = []

    def mock_generate(messages, response_format=None, temperature=0.2):
        nonlocal captured_messages
        captured_messages = messages
        return (
            json.dumps({
                "questions": [
                    {
                        "question_type": "mcq",
                        "question_text": "Follow-up question on protein synthesis?",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": "A",
                        "explanation": "Targeting previous mistake",
                        "difficulty": "medium",
                        "page_number": 1,
                    }
                ]
            }),
            {"prompt_tokens": 100, "completion_tokens": 40},
            110,
        )

    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", side_effect=mock_generate):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            res = client.post(
                f"/api/v1/projects/{project_id}/quizzes",
                json={"num_questions": 1, "difficulty": "medium"},
                headers=headers,
            )
            assert res.status_code == 201

            # Verify prompt contains the previous mistake
            prompt_content = "\n".join([m["content"] for m in captured_messages])
            assert "What is the role of ribosomes" in prompt_content
            assert "protein synthesis" in prompt_content


def test_11_answer_ownership(client, db_session):
    """Verify that Bob cannot submit answers to or complete Alice's quiz attempt."""
    alice_headers = register_and_login(client, "alice_attempt@example.com", "Alice")
    bob_headers = register_and_login(client, "bob_attempt@example.com", "Bob")

    alice_proj = create_space_and_project(client, alice_headers)
    add_ready_material_with_chunks(db_session, alice_proj)

    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "mcq",
                "question_text": "Ownership question?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "explanation": "Detailed explanation of the concept",
                "difficulty": "easy",
                "page_number": 1,
            }
        ]
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=(json.dumps(mock_quiz_payload), {}, 100)):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            quiz_res = client.post(f"/api/v1/projects/{alice_proj}/quizzes", json={"num_questions": 1}, headers=alice_headers)
            quiz_id = quiz_res.json()["id"]
            question_id = quiz_res.json()["questions"][0]["id"]

    # Alice starts attempt
    alice_attempt_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=alice_headers)
    attempt_id = alice_attempt_res.json()["id"]

    # Bob attempts to submit an answer for Alice's attempt -> 404
    bob_submit = client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"question_id": question_id, "answer_text": "A"},
        headers=bob_headers,
    )
    assert bob_submit.status_code == 404

    # Bob attempts to complete Alice's attempt -> 404
    bob_complete = client.post(f"/api/v1/attempts/{attempt_id}/complete", headers=bob_headers)
    assert bob_complete.status_code == 404


def test_12_quiz_completion(client, db_session):
    """Verify quiz completion calculates final percentage score and prevents duplicate submissions."""
    headers = register_and_login(client, "completer@example.com", "Completer")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "mcq",
                "question_text": "Q1 text?",
                "options": ["Correct", "Wrong 1", "Wrong 2", "Wrong 3"],
                "correct_answer": "Correct",
                "explanation": "Q1 explanation",
                "difficulty": "medium",
                "page_number": 1,
            },
            {
                "question_type": "mcq",
                "question_text": "Q2 text?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "explanation": "Q2 explanation",
                "difficulty": "medium",
                "page_number": 1,
            },
        ]
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=(json.dumps(mock_quiz_payload), {}, 100)):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            quiz_res = client.post(f"/api/v1/projects/{project_id}/quizzes", json={"num_questions": 2}, headers=headers)
            quiz_id = quiz_res.json()["id"]
            q1_id = next(q["id"] for q in quiz_res.json()["questions"] if q["question_text"] == "Q1 text?")
            q2_id = next(q["id"] for q in quiz_res.json()["questions"] if q["question_text"] == "Q2 text?")


    attempt_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=headers)
    attempt_id = attempt_res.json()["id"]

    # Submit Q1 correctly (score 1.0)
    client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"question_id": q1_id, "answer_text": "Correct"},
        headers=headers,
    )

    # Test duplicate answer on Q1 in same attempt -> 400
    dup_res = client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"question_id": q1_id, "answer_text": "Correct"},
        headers=headers,
    )
    assert dup_res.status_code == 400

    # Submit Q2 incorrectly (score 0.0)
    client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"question_id": q2_id, "answer_text": "Wrong option"},
        headers=headers,
    )

    # Complete Quiz: total questions = 2, total score = 1.0 -> 50.0%
    comp_res = client.post(f"/api/v1/attempts/{attempt_id}/complete", headers=headers)
    assert comp_res.status_code == 200
    data = comp_res.json()
    assert data["score"] == 50.0
    assert data["completed_at"] is not None

    # Repeated quiz completion returns 400
    dup_comp = client.post(f"/api/v1/attempts/{attempt_id}/complete", headers=headers)
    assert dup_comp.status_code == 400

    # Submitting answer after completion returns 400
    post_comp_sub = client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"question_id": q1_id, "answer_text": "Correct"},
        headers=headers,
    )
    assert post_comp_sub.status_code == 400


def test_13_learning_events(client, db_session):
    """Verify learning events (quiz_created, quiz_attempted, quiz_completed) are recorded."""
    headers = register_and_login(client, "events_user@example.com", "Events User")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    mock_payload = {
        "questions": [
            {
                "question_type": "mcq",
                "question_text": "Events question?",
                "options": ["1", "2", "3", "4"],
                "correct_answer": "1",
                "explanation": "Events exp",
                "difficulty": "easy",
                "page_number": 1,
            }
        ]
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=(json.dumps(mock_payload), {}, 100)):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            quiz_res = client.post(f"/api/v1/projects/{project_id}/quizzes", json={"num_questions": 1}, headers=headers)
            quiz_id = quiz_res.json()["id"]

    attempt_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=headers)
    attempt_id = attempt_res.json()["id"]

    client.post(f"/api/v1/attempts/{attempt_id}/complete", headers=headers)

    # Check LearningEvent table
    created_events = db_session.query(LearningEvent).filter(LearningEvent.event_type == "quiz_created").all()
    assert len(created_events) >= 1
    assert created_events[-1].event_data.get("quiz_id") == quiz_id

    attempted_events = db_session.query(LearningEvent).filter(LearningEvent.event_type == "quiz_attempted").all()
    assert len(attempted_events) >= 1
    assert attempted_events[-1].event_data.get("attempt_id") == attempt_id

    completed_events = db_session.query(LearningEvent).filter(LearningEvent.event_type == "quiz_completed").all()
    assert len(completed_events) >= 1
    assert completed_events[-1].event_data.get("attempt_id") == attempt_id


def test_14_ai_telemetry(client, db_session):
    """Verify AI telemetry records entries for quiz_generation and quiz_evaluation."""
    headers = register_and_login(client, "telemetry_user@example.com", "Telemetry User")
    project_id = create_space_and_project(client, headers)
    add_ready_material_with_chunks(db_session, project_id)

    mock_quiz_payload = {
        "questions": [
            {
                "question_type": "open_ended",
                "question_text": "Telemetry test question?",
                "options": None,
                "correct_answer": "Rubric criteria",
                "explanation": "Explanation",
                "difficulty": "medium",
                "page_number": 1,
            }
        ]
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=(json.dumps(mock_quiz_payload), {"prompt_tokens": 100, "completion_tokens": 50}, 150)):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            quiz_res = client.post(f"/api/v1/projects/{project_id}/quizzes", json={"num_questions": 1}, headers=headers)
            quiz_id = quiz_res.json()["id"]
            question_id = quiz_res.json()["questions"][0]["id"]

    # Start attempt and submit open-ended answer
    attempt_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=headers)
    attempt_id = attempt_res.json()["id"]

    mock_eval_payload = {
        "score": 1.0,
        "is_correct": True,
        "feedback": "Perfect answer.",
        "strengths": ["All points"],
        "gaps": [],
        "improvement_hint": "Keep going.",
    }
    with patch("app.modules.ai.llm.LLMService.generate_chat_completion", return_value=(json.dumps(mock_eval_payload), {"prompt_tokens": 80, "completion_tokens": 30}, 120)):
        with patch("app.modules.ai.embeddings.EmbeddingService.get_embeddings", return_value=[[0.05] * 1536]):
            client.post(
                f"/api/v1/attempts/{attempt_id}/answers",
                json={"question_id": question_id, "answer_text": "Here is the comprehensive answer."},
                headers=headers,
            )

    # Verify AIRequest telemetry
    gen_telemetry = db_session.query(AIRequest).filter(AIRequest.feature == "quiz_generation").all()
    assert len(gen_telemetry) >= 1
    assert gen_telemetry[-1].status == "success"
    assert gen_telemetry[-1].prompt_tokens > 0

    eval_telemetry = db_session.query(AIRequest).filter(AIRequest.feature == "quiz_evaluation").all()
    assert len(eval_telemetry) >= 1
    assert eval_telemetry[-1].status == "success"
    assert eval_telemetry[-1].prompt_tokens > 0
