import time
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app import crud
from app.database import get_db
from app.redis_client import (
    get_cache_with_meta,
    invalidate_items_cache,
    set_cache_with_meta,
)
from app.schemas import (
    ItemCreate,
    ItemResponse,
    ItemsListResponse,
    ItemUpdate,
    SingleItemResponse,
)

router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=ItemsListResponse)
async def list_items(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> ItemsListResponse:
    start_time = time.perf_counter()

    cached_data, cached_at = await get_cache_with_meta("items:all")
    if cached_data is not None:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Cache"] = "HIT"
        return ItemsListResponse(
            items=cached_data,
            cache_hit=True,
            latency_ms=latency_ms,
            cached_at=cached_at,
        )

    # Cache miss - query database
    items = await crud.get_all_items(db)
    items_data = [
        ItemResponse.model_validate(it).model_dump(mode="json")
        for it in items
    ]

    await set_cache_with_meta("items:all", items_data)

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Cache"] = "MISS"
    return ItemsListResponse(
        items=items,
        cache_hit=False,
        latency_ms=latency_ms,
        cached_at=None,
    )


@router.get("/{item_id}", response_model=SingleItemResponse)
async def get_item(
    item_id: int,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> SingleItemResponse:
    start_time = time.perf_counter()

    cache_key = f"items:{item_id}"
    cached_data, _ = await get_cache_with_meta(cache_key)
    if cached_data is not None:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Cache"] = "HIT"
        return SingleItemResponse(
            item=cached_data,
            cache_hit=True,
            latency_ms=latency_ms,
        )

    item = await crud.get_item_by_id(db, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with id {item_id} not found",
        )

    item_dict = ItemResponse.model_validate(item).model_dump(mode="json")
    await set_cache_with_meta(cache_key, item_dict)

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Cache"] = "MISS"
    return SingleItemResponse(
        item=item,
        cache_hit=False,
        latency_ms=latency_ms,
    )


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_new_item(
    item_in: ItemCreate,
    db: AsyncSession = Depends(get_db),
) -> ItemResponse:
    new_item = await crud.create_item(db, item_in)
    # Invalidate items list cache
    await invalidate_items_cache()
    return new_item


@router.put("/{item_id}", response_model=ItemResponse)
async def update_existing_item(
    item_id: int,
    item_in: ItemUpdate,
    db: AsyncSession = Depends(get_db),
) -> ItemResponse:
    updated_item = await crud.update_item(db, item_id, item_in)
    if not updated_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with id {item_id} not found",
        )
    # Invalidate list and specific item cache
    await invalidate_items_cache(item_id)
    return updated_item


@router.delete("/{item_id}", response_model=Dict[str, Any])
async def delete_existing_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    success = await crud.delete_item(db, item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with id {item_id} not found",
        )
    # Invalidate list and specific item cache
    await invalidate_items_cache(item_id)
    return {"status": "deleted", "id": item_id}
