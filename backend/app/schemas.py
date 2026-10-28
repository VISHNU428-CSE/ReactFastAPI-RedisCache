from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Item title")
    description: Optional[str] = Field(None, description="Detailed item description")
    price: Optional[float] = Field(None, ge=0, description="Item price or numerical metric")


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)


class ItemResponse(ItemBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ItemsListResponse(BaseModel):
    items: List[ItemResponse]
    cache_hit: bool
    latency_ms: float
    cached_at: Optional[str] = None


class SingleItemResponse(BaseModel):
    item: ItemResponse
    cache_hit: bool
    latency_ms: float


class CacheStatsResponse(BaseModel):
    keys: int
    connected: bool


class CacheClearResponse(BaseModel):
    status: str


class HealthResponse(BaseModel):
    status: str
    database: str
    redis: str
