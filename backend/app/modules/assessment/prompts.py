import json
from typing import List, Optional
from app.modules.retrieval.services import RetrievedChunk


QUIZ_GEN_SYSTEM_PROMPT = """You are an expert pedagogical assessment generator.
Your job is to generate high-quality quiz questions grounded STRICTLY and EXCLUSIVELY in the provided study material chunks.

CRITICAL RULES:
1. Every question MUST be directly answered by the provided text chunks. Do NOT invent facts or use outside knowledge.
2. Every question must have an exact `page_number` matching one of the pages in the provided chunks. DO NOT hallucinate page numbers.
3. Generate a balanced mixture of Multiple Choice Questions ("mcq") and Open-Ended Conceptual Questions ("open_ended").
4. For "mcq" questions:
   - Provide exactly 4 plausible `options`.
   - `correct_answer` MUST match exactly one of the strings in `options`.
   - Provide a clear, educational `explanation`.
5. For "open_ended" questions:
   - `options` MUST be null.
   - `correct_answer` MUST be a comprehensive rubric / key points that an ideal student answer should cover.
   - Provide a clear `explanation` detailing the complete concept.
6. Set `difficulty` to "easy", "medium", or "hard" as requested.
7. If previous learner weaknesses or mistakes are provided, ADAPT by creating questions that target those specific misunderstandings or deficient topics.

You must respond ONLY with a JSON object adhering to this schema:
{
  "questions": [
    {
      "question_type": "mcq",
      "question_text": "string",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "correct_answer": "option 1",
      "explanation": "string",
      "difficulty": "medium",
      "page_number": 1
    },
    {
      "question_type": "open_ended",
      "question_text": "string",
      "options": null,
      "correct_answer": "Key rubric points...",
      "explanation": "Detailed explanation...",
      "difficulty": "medium",
      "page_number": 1
    }
  ]
}
"""


EVALUATION_SYSTEM_PROMPT = """You are an educational assessment evaluator.
Your job is to evaluate a learner's open-ended answer against the question, the expected answer rubric, and the supporting material chunks.

EVALUATION RULES:
1. Ground your evaluation STRICTLY in the provided source material and rubric.
2. Be objective, constructive, and educational. Never make psychological, ability, or derogatory remarks.
3. Assign a score between 0.0 and 1.0:
   - 1.0: Completely accurate, covers all rubric points.
   - 0.6 - 0.9: Mostly accurate with minor omissions.
   - 0.3 - 0.5: Partially correct or superficial understanding.
   - 0.0 - 0.2: Completely inaccurate, off-topic, or empty.
4. Mark `is_correct` as true if score >= 0.6, otherwise false.
5. Provide:
   - `feedback`: Clear, encouraging summary of their answer's accuracy.
   - `strengths`: Specific points or terminology the learner accurately identified.
   - `gaps`: Key elements from the material or rubric that were missed or misunderstood.
   - `improvement_hint`: Actionable advice on what concept to review in the text.

You must respond ONLY with a JSON object adhering to this schema:
{
  "score": 0.85,
  "is_correct": true,
  "feedback": "string",
  "strengths": ["point 1", "point 2"],
  "gaps": ["missing point 1"],
  "improvement_hint": "Review the concept of..."
}
"""


def format_chunks_for_quiz(chunks: List[RetrievedChunk]) -> str:
    """Format retrieved chunks into a clear text context with explicit page numbers."""
    if not chunks:
        return "No study material available."
    formatted = []
    for i, c in enumerate(chunks, 1):
        formatted.append(f"--- Material Chunk {i} [Page {c.page_number}] (Material ID: {c.material_id}) ---\n{c.content.strip()}")
    return "\n\n".join(formatted)


def format_learner_weaknesses(weaknesses: List[dict]) -> str:
    """Format previous learner errors to guide adaptive question generation."""
    if not weaknesses:
        return "No previous quiz history available. Generate a balanced quiz covering foundational concepts."
    lines = ["The learner previously struggled with the following questions and concepts:"]
    for idx, w in enumerate(weaknesses[:6], 1):
        lines.append(f"{idx}. Question: {w.get('question_text', '')}")
        if w.get('concept'):
            lines.append(f"   Weakness/Explanation: {w.get('concept')}")
        if w.get('difficulty'):
            lines.append(f"   Difficulty: {w.get('difficulty')}")
    lines.append("Generate questions that reinforce and evaluate understanding of these deficient areas.")
    return "\n".join(lines)


def build_quiz_generation_prompt(
    chunks: List[RetrievedChunk],
    num_questions: int,
    difficulty: str,
    weaknesses: Optional[List[dict]] = None,
) -> List[dict]:
    """Construct messages for LLM quiz generation."""
    chunks_context = format_chunks_for_quiz(chunks)
    weakness_context = format_learner_weaknesses(weaknesses or [])

    user_content = (
        f"STUDY MATERIAL CHUNKS:\n{chunks_context}\n\n"
        f"LEARNER HISTORY & WEAKNESSES:\n{weakness_context}\n\n"
        f"REQUEST:\n"
        f"Please generate exactly {num_questions} questions for a study quiz with target difficulty '{difficulty}'. "
        f"Include a balanced mix of 'mcq' and 'open_ended' questions. "
        f"Every question MUST cite a valid page number from the provided chunks above."
    )

    return [
        {"role": "system", "content": QUIZ_GEN_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def build_evaluation_prompt(
    question_text: str,
    rubric: str,
    learner_answer: str,
    supporting_chunks: List[RetrievedChunk],
) -> List[dict]:
    """Construct messages for LLM open-ended evaluation."""
    chunks_context = format_chunks_for_quiz(supporting_chunks)

    user_content = (
        f"SUPPORTING STUDY MATERIAL:\n{chunks_context}\n\n"
        f"QUESTION:\n{question_text}\n\n"
        f"EXPECTED ANSWER / RUBRIC:\n{rubric}\n\n"
        f"LEARNER ANSWER:\n{learner_answer}\n\n"
        f"Please evaluate the learner's answer according to the rubric and supporting material."
    )

    return [
        {"role": "system", "content": EVALUATION_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
