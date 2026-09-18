# Known Limitations

This document outlines the real, verified technical and functional limitations of the AI Study Companion prototype as discovered during the PRD Compliance Audit.

## 1. Background Processing on Render Free
- **No Dedicated Celery Worker:** Due to cost constraints, the production deployment on the Render Free tier does not run a dedicated Celery background worker. The application gracefully falls back to using `FastAPI BackgroundTasks` (triggered by the `USE_CELERY=False` environment variable).
- **Service Sleep Behavior:** Render Free web services spin down after 15 minutes of inactivity. If a large PDF is being processed or an AI job is running in the background thread when the service sleeps, the task will be abruptly killed and the job will remain perpetually stuck in the `PROCESSING` state.
- **Missing Auto-Retry in Fallback Mode:** While the local Celery implementation supports exponential backoff for transient AI/database failures, the Render Free `BackgroundTasks` fallback does not. An API failure during processing will cause the job to immediately fail without retry.

## 2. Resource & Scaling Constraints
- **Memory Limitations:** The FastAPI server and the heavy PyMuPDF document extraction logic currently share the same 512MB RAM constraint in production. Uploading excessively large PDFs (e.g., dense textbooks spanning hundreds of pages) may cause Out-Of-Memory (OOM) errors, resulting in silent container reboots.
- **API Rate Limits:** Extensive interactions, particularly rapid parallel quiz generation or large document embeddings, may hit Google Gemini API rate limits (HTTP 429), resulting in failed AI operations.

## 3. Document Understanding
- **Basic Text Extraction Only:** The document processing pipeline uses PyMuPDF to extract flat text. It does not possess "rich document understanding." It cannot interpret the structural layout of complex tables, read text within flattened images, or semantically interpret charts and diagrams.

## 4. AI Experience & Observability
- **No Streaming Tutor:** The AI Tutor relies on a standard blocking HTTP call to the Gemini API (`generate_chat_completion`). It does not utilize Server-Sent Events (SSE) or WebSockets to stream responses back to the UI, meaning the user must wait for the entire response to generate before seeing text.
- **No API-level Caching:** There is no Redis-backed API caching layer for frequent retrieval queries or repeated AI questions. Every request triggers a fresh vector search and LLM invocation.
- **Limited Deep AI Tracing:** While basic telemetry (latency, tokens, success/failure) is tracked in the database via custom functions, there is no deep distributed tracing (e.g., LangSmith or Langfuse) integrated directly into the application code for granular span tracking.
- **No Automated LLM Regression Evaluation:** There is currently no automated test suite utilizing an LLM-as-a-judge to evaluate the qualitative degradation of prompts when underlying models change. Prompt evaluation remains a manual, qualitative process.
