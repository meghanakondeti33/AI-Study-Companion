from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session
import redis

from app.config import settings
from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health", status_code=status.HTTP_200_OK)
def check_health(db: Session = Depends(get_db)):
    """System health check verifying API, Database, and Redis status."""
    db_status = "unhealthy"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    redis_status = "unhealthy"
    try:
        r = redis.from_url(settings.REDIS_URL, socket_timeout=2)
        if r.ping():
            redis_status = "connected"
    except Exception as e:
        redis_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" and redis_status == "connected" else "degraded",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {
            "database": db_status,
            "redis": redis_status,
        },
    }
