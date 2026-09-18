# Development Prompts

This document tracks the materially important AI development prompts used to build and debug the AI Study Companion.

> **Note on Prompt Availability:** Due to the iterative nature of the development process and the limitations of recovering the complete historical chat log of the autonomous agent, some early architectural and scaffolding prompts are not available. The prompts listed below represent the documented, recovered interactions focusing on complex debugging, deployment stabilization, and architectural pivots.

## Architecture & Deployment

**Render Free Background Processing Workaround**
> "We discovered that Render's free Web Service does not provide Shell access... I want to solve this using the Render deployment configuration. Please inspect the backend/Alembic setup and determine the safest minimal way to automatically run: `alembic upgrade head` during Render deployment before the FastAPI server starts. Important: Do NOT change application code unless absolutely necessary. Do NOT change database configuration... Recommend the exact Render Build Command."

> "The production deployment is now working... However, after uploading a PDF in production, the material remains permanently 'Queued for processing'. The reason is that our Render Web Service is on the Free plan and we cannot run a paid Render Background Worker... I need you to inspect the existing implementation and determine the smallest safe change that allows PDF processing to work on the existing free Render Web Service WITHOUT requiring a separate paid worker... Preserve the existing PDF extraction, chunking, embeddings, concept extraction, and material status logic... Do not remove Celery from the project if it is useful for local development."

> "Yes. Implement the proposed minimal fix. Requirements: Keep the existing Celery implementation unchanged for environments where Celery is available. Add a USE_CELERY configuration setting... Implement the reusable synchronous background-processing wrapper in tasks.py. Update the material upload endpoint to accept FastAPI BackgroundTasks."

## Frontend & Routing

**Vercel SPA Routing Fix**
> "The production API URL and CORS issues are now fixed. We have a new production frontend issue: Opening the deployed frontend directly at: `https://.../register` returns Vercel: 404 NOT_FOUND. The root frontend deployment itself is working, but direct navigation to the React route `/register` is returning a Vercel 404. This is a Vite + React SPA and React Router should handle `/register` client-side. Please investigate the Vercel SPA routing configuration... If no SPA rewrite exists, add the minimal Vercel configuration required to rewrite application routes to `/index.html`."

**API URL Targeting**
> "We have a deployment issue with the AI Study Companion frontend... When registering from the deployed frontend, Chrome Network shows: Request URL: `https://.../api/v1/auth/register` Status: 404 Not Found. This proves the frontend is making a relative API request to the Vercel domain instead of the Render backend. Important: Do not guess or blindly change configuration. Inspect the entire frontend API configuration and locate exactly how the API base URL is constructed."

## Debugging

**CORS Preflight Debugging**
> "The deployed frontend is now correctly sending requests to: `https://.../api/v1/auth/register`. However, registration is now failing at the CORS preflight stage. Chrome DevTools Network shows: Request URL: `...` Request Method: OPTIONS Status Code: 400 Bad Request... Please investigate the backend CORS configuration. Tasks: Inspect the FastAPI application and locate the CORSMiddleware configuration. Determine exactly which origins are currently allowed. Add the production Vercel frontend origin... Preserve local development origins."

**Tutor AI Flow Tracing**
> "The REAL AI Tutor is still failing in the browser... The AI Tutor UI loads correctly, but when I send a question it displays: 'The AI Tutor service is temporarily unavailable.' ... We need to debug the REAL browser Tutor flow. DO NOT change the UI/theme... Trace the complete request when I click: Adaptive Quiz → Generate Quiz → Gemini AI. Check: Browser network request, Frontend API client, FastAPI quiz endpoint, Quiz generation service, Gemini LLM service, Prompt construction, Gemini response, JSON/Pydantic parsing, Database persistence, Error handling."

## Database

*Early database schema and pgvector scaffolding prompts are not available in the recovered history.*

## AI/RAG

*Initial RAG extraction, semantic chunking, and AI evaluation prompts are not available in the recovered history.*

## Testing

*Initial test suite generation prompts are not available in the recovered history.*

## Documentation

> "I want you to perform a COMPLETE REQUIREMENTS AUDIT of this AI Study Companion project against the attached Product Requirements Document (PRD)... Your job is to inspect the ENTIRE existing project and determine exactly which PRD requirements are actually implemented, partially implemented, missing, or impossible to verify... Use the attached Project Requirements PDF as the PRIMARY source of truth."
