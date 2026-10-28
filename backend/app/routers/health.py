from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.redis_client import is_redis_connected
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    # Check Database connection
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    # Check Redis connection
    redis_connected = await is_redis_connected()
    redis_status = "connected" if redis_connected else "disconnected"

    overall_status = "ok" if (db_status == "connected" and redis_connected) else "degraded"

    return HealthResponse(
        status=overall_status,
        database=db_status,
        redis=redis_status,
    )
