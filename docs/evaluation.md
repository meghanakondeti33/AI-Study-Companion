# Evaluation Approach

This document outlines the evaluation methodologies used to verify the AI Study Companion, covering both traditional software testing and AI-specific evaluation strategies.

## 1. Automated Software Testing (Backend)

The backend features a robust automated test suite utilizing `pytest`. A total of **116 tests** run successfully, covering all 10 phases of the core learning loop.

### Core Testing Coverage:
- **Authentication & Authorization:** Verifies JWT generation, validation, and endpoint protection (`test_phase1.py`).
- **Project Isolation:** Ensures that users can only access spaces, projects, and materials they own. Cross-tenant access attempts are actively tested and rejected (`test_phase1.py`, `test_phase2.py`).
- **Material Processing:** Tests the end-to-end PDF processing flow, including chunking and embedding storage in `pgvector` (`test_phase2.py`).
- **Tutor Interaction:** Mocks the LLM dependency to verify that the conversation history is maintained and properly routed (`test_phase3.py`).
- **Quiz Generation & Assessment:** Verifies the creation of adaptive quizzes, including both MCQ and open-ended structures (`test_phase4.py`).
- **Mastery & Growth:** Ensures that evaluating a quiz correctly updates the concept mastery percentages and calculates growth trends (Improving, Stable, Requiring Attention) (`test_phase5.py`, `test_phase6.py`).
- **Recommendations & Analytics:** Validates the logic that generates next steps based on weak concepts, and aggregates project-wide metrics (`test_phase7.py`, `test_phase9.py`).
- **Admin Visibility:** Verifies administrative access controls and platform-level visibility (`test_phase10.py`).
- **Background Processing:** Tests the asynchronous queuing of tasks and status transitions (`QUEUED` → `PROCESSING` → `READY`) (`test_phase8.py`).

## 2. AI-Specific Evaluation

AI behavior is evaluated through deterministic logic gates, structured schemas, and manual qualitative review rather than automated regression evaluation (which is currently not implemented).

### Grounded Answers & Citation Validation
- **Evaluation Strategy:** The system actively intercepts and filters hallucinations through strict citation validation.
- **Implementation:** During Tutor responses, the LLM outputs a structured JSON response containing citations (material ID and page number). The backend intercepts this response and compares the cited page numbers against the exact page numbers retrieved during the vector search. Any citation to a page that was not physically retrieved is stripped from the response, strictly tying the LLM to the provided context.

### Unsupported-Question Handling
- **Evaluation Strategy:** We evaluate the system's ability to gracefully refuse to answer questions when evidence is lacking.
- **Implementation:** When a user asks a question, the vector similarity search uses a strict cosine similarity threshold. If no chunks exceed this threshold, the system entirely bypasses the LLM and deterministically returns a predefined `GROUNDED_REFUSAL_MESSAGE`. This prevents the LLM from attempting to guess answers outside of the project materials.

### Structured Outputs
- **Evaluation Strategy:** AI responses must conform to strict data structures for application integration.
- **Implementation:** The application uses Gemini's `json_object` mode paired with strongly typed Pydantic models (e.g., `QuizGenerationAIResponse`, `OpenEndedEvaluation`). Outputs are validated at runtime; failure to adhere to the schema raises controlled exceptions which trigger application-level retries.

### Assessment Evaluation (LLM-as-a-Judge)
- **Evaluation Strategy:** Open-ended user answers are graded by the AI.
- **Implementation:** The system provides the LLM with the user's answer, the reference material chunks, and a rubric. The LLM must output a JSON structure identifying exactly which key concepts were covered, which concepts were missing, a numerical score, and constructive feedback.

## 3. Known Evaluation Limitations

- **No Automated LLM-as-a-Judge Regression Evaluation:** While the application uses deterministic tests for routing and structure, there is no automated pipeline that continually evaluates the *qualitative* correctness of prompt outputs against a golden dataset across model version changes. Prompt adjustments currently require manual qualitative review.
