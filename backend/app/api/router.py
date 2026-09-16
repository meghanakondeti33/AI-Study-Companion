from fastapi import APIRouter
from app.api.v1 import health

api_router = APIRouter()

# Health checks
api_router.include_router(health.router, prefix="/v1")
