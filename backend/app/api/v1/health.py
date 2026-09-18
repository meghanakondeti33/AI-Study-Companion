from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session
import redis

from app.config import settings
from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health", status_code=status.HTTP_200_OK)
def check_health(db: Session = Depends(get_db)):
    """System health check verifying API, Database, Redis, Storage, and AI configuration safely without leaking credentials."""
    db_status = "error: disconnected"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error: disconnected"

    redis_status = "error: disconnected"
    try:
        r = redis.from_url(settings.REDIS_URL, socket_timeout=2)
        if r.ping():
            redis_status = "connected"
    except Exception:
        redis_status = "error: disconnected"

    storage_status = "ready"
    try:
        from pathlib import Path
        storage_path = Path(settings.STORAGE_LOCAL_PATH)
        storage_path.mkdir(parents=True, exist_ok=True)
    except Exception:
        storage_status = "unavailable"

    ai_status = "configured" if bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() and settings.GEMINI_API_KEY not in ("your-gemini-api-key-here", "your-openai-api-key-here", "mock-key")) else "mock_mode"

    is_healthy = db_status == "connected" and redis_status == "connected" and storage_status == "ready"

    return {
        "status": "healthy" if is_healthy else "degraded",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {
            "database": db_status,
            "redis": redis_status,
            "storage": storage_status,
            "ai_provider": ai_status,
        },
    }
