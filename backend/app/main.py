import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import crud
from app.config import get_settings
from app.database import AsyncSessionLocal, init_db
from app.redis_client import close_redis, get_redis_client
from app.routers import cache, health, items
from app.schemas import ItemCreate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


async def seed_initial_items_if_empty() -> None:
    """Seed initial sample data if items table is empty."""
    try:
        async with AsyncSessionLocal() as session:
            existing = await crud.get_all_items(session)
            if not existing:
                logger.info("Seeding initial sample items...")
                sample_items = [
                    ItemCreate(
                        title="High-Performance Redis In-Memory Caching",
                        description="Sub-millisecond read latency with automatic cache invalidation on write.",
                    ),
                    ItemCreate(
                        title="PostgreSQL Relational Persistence",
                        description="ACID compliant database storage with SQLAlchemy 2.0 async engine.",
                    ),
                    ItemCreate(
                        title="FastAPI Modern Python Framework",
                        description="Async endpoints, OpenAPI documentation, and high-performance type validation.",
                    ),
                    ItemCreate(
                        title="React TypeScript Interactive UI",
                        description="Modern frontend dashboard displaying live cache metrics and latency comparisons.",
                    ),
                ]
                for item_in in sample_items:
                    await crud.create_item(session, item_in)
                logger.info("Successfully seeded sample items.")
    except Exception as e:
        logger.warning(f"Could not seed initial items: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    try:
        await init_db()
        await seed_initial_items_if_empty()
    except Exception as e:
        logger.warning(f"Database init warning: {e}")

    logger.info("Connecting to Redis...")
    await get_redis_client()

    yield

    # Shutdown
    logger.info("Shutting down and releasing resources...")
    await close_redis()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = settings.CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Cache", "Content-Type"],
)

# Register routes
app.include_router(health.router)
app.include_router(items.router, prefix=settings.API_V1_STR)
app.include_router(cache.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": f"{settings.PROJECT_NAME} API is running",
        "docs_url": "/docs",
        "health_url": "/health",
        "items_url": f"{settings.API_V1_STR}/items",
    }
