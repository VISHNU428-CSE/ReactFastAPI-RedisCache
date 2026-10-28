import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.database import Base, get_db
from app.main import app
import app.redis_client as redis_client


# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


# Mock Redis in-memory store for unit testing when Redis is not running
class MockRedis:
    def __init__(self):
        self.store = {}

    async def get(self, key):
        return self.store.get(key)

    async def set(self, key, value, ex=None):
        self.store[key] = value
        return True

    async def delete(self, *keys):
        deleted = 0
        for k in keys:
            if k in self.store:
                del self.store[k]
                deleted += 1
        return deleted

    async def keys(self, pattern):
        import fnmatch
        return [k for k in self.store.keys() if fnmatch.fnmatch(k, pattern)]

    async def scan_iter(self, match=None, count=None):
        import fnmatch
        for k in list(self.store.keys()):
            if match is None or fnmatch.fnmatch(k, match):
                yield k

    async def ping(self):
        return True

    async def close(self):
        pass


@pytest.fixture(autouse=True)
async def setup_db_and_mock_redis(monkeypatch):
    # Setup test tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Mock Redis client
    mock_redis = MockRedis()
    async def mock_get_redis():
        return mock_redis
    async def mock_is_connected():
        return True
    monkeypatch.setattr(redis_client, "get_redis_client", mock_get_redis)
    monkeypatch.setattr(redis_client, "is_redis_connected", mock_is_connected)

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ["ok", "degraded"]
        assert "database" in data
        assert "redis" in data


@pytest.mark.asyncio
async def test_items_crud_and_caching():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Create item
        create_res = await ac.post(
            "/api/items",
            json={"title": "Test Item 1", "description": "Cache testing description", "price": 49.99},
        )
        assert create_res.status_code == 201
        created = create_res.json()
        item_id = created["id"]
        assert created["title"] == "Test Item 1"
        assert created["price"] == 49.99

        # 2. First GET /api/items -> Cache MISS
        list_res1 = await ac.get("/api/items")
        assert list_res1.status_code == 200
        data1 = list_res1.json()
        assert data1["cache_hit"] is False
        assert list_res1.headers.get("X-Cache") == "MISS"
        assert len(data1["items"]) == 1

        # 3. Second GET /api/items -> Cache HIT
        list_res2 = await ac.get("/api/items")
        assert list_res2.status_code == 200
        data2 = list_res2.json()
        assert data2["cache_hit"] is True
        assert list_res2.headers.get("X-Cache") == "HIT"

        # 4. Get single item -> MISS then HIT
        item_res1 = await ac.get(f"/api/items/{item_id}")
        assert item_res1.status_code == 200
        assert item_res1.json()["cache_hit"] is False
        assert item_res1.headers.get("X-Cache") == "MISS"

        item_res2 = await ac.get(f"/api/items/{item_id}")
        assert item_res2.status_code == 200
        assert item_res2.json()["cache_hit"] is True
        assert item_res2.headers.get("X-Cache") == "HIT"

        # 5. Update item -> should invalidate cache
        update_res = await ac.put(
            f"/api/items/{item_id}",
            json={"title": "Updated Test Item"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["title"] == "Updated Test Item"

        # List should now be MISS again due to invalidation
        list_res3 = await ac.get("/api/items")
        assert list_res3.status_code == 200
        assert list_res3.json()["cache_hit"] is False
        assert list_res3.json()["items"][0]["title"] == "Updated Test Item"

        # 6. Delete item
        del_res = await ac.delete(f"/api/items/{item_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # 404 for deleted item
        not_found = await ac.get(f"/api/items/{item_id}")
        assert not_found.status_code == 404


@pytest.mark.asyncio
async def test_cache_clear_and_stats():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Populate cache
        await ac.post(
            "/api/items",
            json={"title": "Item for Stats", "description": "Description"},
        )
        await ac.get("/api/items")

        stats_res = await ac.get("/api/cache/stats")
        assert stats_res.status_code == 200
        assert stats_res.json()["keys"] >= 1

        clear_res = await ac.post("/api/cache/clear")
        assert clear_res.status_code == 200
        assert clear_res.json()["status"] == "cache cleared"

        stats_res2 = await ac.get("/api/cache/stats")
        assert stats_res2.status_code == 200
        assert stats_res2.json()["keys"] == 0


@pytest.mark.asyncio
async def test_redis_outage_fallback(monkeypatch):
    """Verify that when Redis is completely offline, API gracefully queries PostgreSQL."""
    async def mock_none_redis():
        return None

    monkeypatch.setattr(redis_client, "get_redis_client", mock_none_redis)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Create item in DB while Redis is offline
        create_res = await ac.post(
            "/api/items",
            json={"title": "Fallback Item", "description": "Offline Redis Test"},
        )
        assert create_res.status_code == 201

        # 2. Query items: should succeed with 200, cache_hit=False, header MISS
        list_res = await ac.get("/api/items")
        assert list_res.status_code == 200
        data = list_res.json()
        assert data["cache_hit"] is False
        assert list_res.headers.get("X-Cache") == "MISS"
        assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_item_validation_errors():
    """Verify input validation rules on items endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Empty title should fail with 422
        res_empty = await ac.post("/api/items", json={"title": ""})
        assert res_empty.status_code == 422

        # Title exceeding 255 chars should fail with 422
        res_long = await ac.post("/api/items", json={"title": "A" * 256})
        assert res_long.status_code == 422


@pytest.mark.asyncio
async def test_item_not_found_errors():
    """Verify 404 responses for non-existent item IDs across GET, PUT, DELETE."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res_get = await ac.get("/api/items/999999")
        assert res_get.status_code == 404
        assert "not found" in res_get.json()["detail"].lower()

        res_put = await ac.put("/api/items/999999", json={"title": "Updated"})
        assert res_put.status_code == 404

        res_del = await ac.delete("/api/items/999999")
        assert res_del.status_code == 404


@pytest.mark.asyncio
async def test_price_persistence_create_update_reload():
    """Regression test: verify price survives create, update, and reload across cache miss and hit."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Create item with price 199.9
        create_res = await ac.post(
            "/api/items",
            json={"title": "Laptop Pro", "description": "High performance laptop", "price": 199.9},
        )
        assert create_res.status_code == 201
        created = create_res.json()
        item_id = created["id"]
        assert created["price"] == 199.9

        # 2. Cache MISS fetch (reload)
        get_res1 = await ac.get(f"/api/items/{item_id}")
        assert get_res1.status_code == 200
        assert get_res1.json()["item"]["price"] == 199.9
        assert get_res1.json()["cache_hit"] is False

        # 3. Cache HIT fetch
        get_res2 = await ac.get(f"/api/items/{item_id}")
        assert get_res2.status_code == 200
        assert get_res2.json()["item"]["price"] == 199.9
        assert get_res2.json()["cache_hit"] is True

        # 4. Update item with price 199.99 (Save & Invalidate)
        update_res = await ac.put(
            f"/api/items/{item_id}",
            json={"title": "Laptop Pro", "description": "High performance laptop", "price": 199.99},
        )
        assert update_res.status_code == 200
        assert update_res.json()["price"] == 199.99

        # 5. Reload (GET items / GET single item): verify price is 199.99
        list_res = await ac.get("/api/items")
        assert list_res.status_code == 200
        matching = [it for it in list_res.json()["items"] if it["id"] == item_id]
        assert len(matching) == 1
        assert matching[0]["price"] == 199.99

        single_reload = await ac.get(f"/api/items/{item_id}")
        assert single_reload.status_code == 200
        assert single_reload.json()["item"]["price"] == 199.99
