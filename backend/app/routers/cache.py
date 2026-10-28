from fastapi import APIRouter
from app.redis_client import clear_cache, get_cache_stats
from app.schemas import CacheClearResponse, CacheStatsResponse

router = APIRouter(prefix="/cache", tags=["cache"])


@router.post("/clear", response_model=CacheClearResponse)
async def clear_all_items_cache() -> CacheClearResponse:
    await clear_cache()
    return CacheClearResponse(status="cache cleared")


@router.get("/stats", response_model=CacheStatsResponse)
async def get_redis_cache_stats() -> CacheStatsResponse:
    stats = await get_cache_stats()
    return CacheStatsResponse(**stats)
