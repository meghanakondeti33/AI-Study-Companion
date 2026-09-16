from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Callable, Dict, Any
import time
import uuid
from datetime import datetime, timezone

from .models import AIEvaluation, AIRequest
from app.modules.ai.llm import get_llm_service


class EvaluationCase(BaseModel):
    input_prompt: str
    expected_output: Optional[str] = None
    metadata: Dict[str, Any] = {}


class EvaluationResult(BaseModel):
    ai_request_id: str
    evaluator_type: str
    score: int
    passed: bool
    feedback: str
    output: str


def run_exact_match_evaluator(case: EvaluationCase, output: str) -> tuple[int, bool, str]:
    if not case.expected_output:
        return 0, False, "No expected output provided for exact match"
    
    passed = case.expected_output.strip().lower() == output.strip().lower()
    score = 100 if passed else 0
    feedback = "Exact match" if passed else f"Expected '{case.expected_output}', got '{output}'"
    return score, passed, feedback


def run_llm_judge_evaluator(case: EvaluationCase, output: str) -> tuple[int, bool, str]:
    prompt = f"""
Evaluate the following AI output based on the input prompt.
Input: {case.input_prompt}
Output: {output}
Expected Output / Criteria: {case.expected_output or 'N/A'}

Respond EXACTLY in this format:
SCORE: [0-100]
PASSED: [true/false]
FEEDBACK: [reasoning]
"""
    try:
        messages = [{"role": "system", "content": "You are an impartial AI judge."}, {"role": "user", "content": prompt}]
        judge_result, _, _ = get_llm_service().generate_chat_completion(messages=messages)
        lines = judge_result.split("\n")
        score = 0
        passed = False
        feedback = "Failed to parse judge output"
        
        for line in lines:
            line = line.strip()
            if line.startswith("SCORE:"):
                try:
                    score = int(line.split(":")[1].strip())
                except:
                    pass
            elif line.startswith("PASSED:"):
                passed = line.split(":")[1].strip().lower() == "true"
            elif line.startswith("FEEDBACK:"):
                feedback = line.split(":", 1)[1].strip()
                
        return score, passed, feedback
    except Exception as e:
        return 0, False, f"LLM Judge failed: {str(e)}"


def run_evaluation_suite(
    db: Session, 
    cases: List[EvaluationCase], 
    evaluator_type: str = "exact_match",
    system_prompt: str = ""
) -> List[EvaluationResult]:
    
    results = []
    
    for case in cases:
        # Run the actual AI request we are testing
        start_time = time.time()
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": case.input_prompt})
            output, usage, latency_ms = get_llm_service().generate_chat_completion(messages=messages)
            total_tokens = usage.get("total_tokens", 0)
            status = "success"
        except Exception as e:
            output = f"Error: {str(e)}"
            status = "error"
            latency_ms = int((time.time() - start_time) * 1000)
            total_tokens = 0
            
        # Log AI Request
        request_id = str(uuid.uuid4())
        ai_req = AIRequest(
            id=request_id,
            user_id="system",
            project_id=None,
            feature="evaluation_run",
            model="evaluator-model",
            status=status,
            latency_ms=latency_ms,
            total_tokens=total_tokens,
            error_message=output if status == "error" else None,
            created_at=datetime.now(timezone.utc)
        )
        db.add(ai_req)
        db.commit()
        
        if status == "error":
            results.append(EvaluationResult(
                ai_request_id=request_id,
                evaluator_type=evaluator_type,
                score=0,
                passed=False,
                feedback=output,
                output=""
            ))
            continue
            
        # Run Evaluator
        if evaluator_type == "exact_match":
            score, passed, feedback = run_exact_match_evaluator(case, output)
        elif evaluator_type == "llm_judge":
            score, passed, feedback = run_llm_judge_evaluator(case, output)
        else:
            score, passed, feedback = 0, False, "Unknown evaluator type"
            
        # Store Evaluation
        eval_id = str(uuid.uuid4())
        ai_eval = AIEvaluation(
            id=eval_id,
            ai_request_id=request_id,
            evaluator_type=evaluator_type,
            score=score,
            passed=passed,
            feedback=feedback,
            created_at=datetime.now(timezone.utc)
        )
        db.add(ai_eval)
        db.commit()
        
        results.append(EvaluationResult(
            ai_request_id=request_id,
            evaluator_type=evaluator_type,
            score=score,
            passed=passed,
            feedback=feedback,
            output=output
        ))
        
    return results
