from fastapi import APIRouter
from app.api.v1 import health
from app.modules.auth.router import router as auth_router
from app.modules.spaces.router import router as spaces_router
from app.modules.projects.router import router as projects_router
from app.modules.materials.router import router as materials_router
from app.modules.tutor.router import router as tutor_router
from app.modules.assessment.router import router as assessment_router

api_router = APIRouter()

# Health checks
api_router.include_router(health.router, prefix="/v1")

# Phase 1: Auth, Spaces, Projects
api_router.include_router(auth_router, prefix="/v1")
api_router.include_router(spaces_router, prefix="/v1")
api_router.include_router(projects_router, prefix="/v1")

# Phase 2: Materials / PDF Processing
api_router.include_router(materials_router, prefix="/v1")

# Phase 3: AI Tutor + RAG + Grounded Citations
api_router.include_router(tutor_router, prefix="/v1")

# Phase 4: Adaptive Quiz + Understanding Evaluation
api_router.include_router(assessment_router, prefix="/v1")

# Phase 5: Concept Mastery Tracking
from app.modules.mastery.router import router as mastery_router
api_router.include_router(mastery_router, prefix="/v1")

# Phase 6: Growth Classification + Personalized Recommendations
from app.modules.growth.router import router as growth_router
from app.modules.recommendations.router import router as recommendations_router
api_router.include_router(growth_router, prefix="/v1")
api_router.include_router(recommendations_router, prefix="/v1")

# Phase 7: Persistent Learner Context
from app.modules.learner_context.router import router as learner_context_router
api_router.include_router(learner_context_router, prefix="/v1")

