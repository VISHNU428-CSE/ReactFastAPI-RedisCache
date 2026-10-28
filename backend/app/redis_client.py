import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional, Tuple
import redis.asyncio as aioredis
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> Optional[aioredis.Redis]:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}")
            return None
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
        except Exception as e:
            logger.warning(f"Error closing Redis client: {e}")
        finally:
            _redis_client = None


async def is_redis_connected() -> bool:
    client = await get_redis_client()
    if client is None:
        return False
    try:
        return await client.ping()
    except Exception:
        return False


async def get_cache_with_meta(key: str) -> Tuple[Optional[Any], Optional[str]]:
    """Returns (cached_data, cached_at_iso_string) or (None, None)."""
    client = await get_redis_client()
    if client is None:
        return None, None
    try:
        raw = await client.get(key)
        if not raw:
            return None, None
        payload = json.loads(raw)
        if isinstance(payload, dict) and "cached_at" in payload and "data" in payload:
            return payload["data"], payload["cached_at"]
        return payload, None
    except Exception as e:
        logger.warning(f"Redis get error for {key}: {e}")
        return None, None


async def set_cache_with_meta(key: str, data: Any, ttl: Optional[int] = None) -> bool:
    client = await get_redis_client()
    if client is None:
        return False
    try:
        ttl = ttl or settings.CACHE_TTL_SECONDS
        payload = {
            "cached_at": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        await client.set(key, json.dumps(payload), ex=ttl)
        return True
    except Exception as e:
        logger.warning(f"Redis set error for {key}: {e}")
        return False


async def invalidate_items_cache(item_id: Optional[int] = None) -> None:
    client = await get_redis_client()
    if client is None:
        return
    try:
        keys_to_delete = ["items:all"]
        if item_id is not None:
            keys_to_delete.append(f"items:{item_id}")
        await client.delete(*keys_to_delete)
    except Exception as e:
        logger.warning(f"Redis invalidation error: {e}")


async def clear_cache() -> int:
    client = await get_redis_client()
    if client is None:
        return 0
    try:
        keys = []
        async for k in client.scan_iter(match="items:*", count=100):
            keys.append(k)
        if keys:
            return await client.delete(*keys)
        return 0
    except Exception as e:
        logger.warning(f"Redis clear error: {e}")
        return 0


async def get_cache_stats() -> dict:
    client = await get_redis_client()
    if client is None:
        return {"keys": 0, "connected": False}
    try:
        connected = await client.ping()
        count = 0
        async for _ in client.scan_iter(match="items:*", count=100):
            count += 1
        return {"keys": count, "connected": bool(connected)}
    except Exception:
        return {"keys": 0, "connected": False}
