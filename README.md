# React + FastAPI + Redis Caching + PostgreSQL

Full-stack application featuring high-performance Redis caching, PostgreSQL persistence, FastAPI async backend, and a modern React frontend dashboard with Docker Compose orchestration.

## Architecture

```
                                    +--------------------+
                                    |   React Frontend   |
                                    |    (:3000/:5173)   |
                                    +---------+----------+
                                              |
                                              v
                                    +--------------------+
                                    |  FastAPI Backend   |
                                    |       (:8000)      |
                                    +---+------------+---+
                                        |            |
                                  Cache |            | Persistence
                                  Check |            | Fallback/Writes
                                        v            v
                              +------------+     +----------------+
                              |   Redis    |     |   PostgreSQL   |
                              |  (:6379)   |     |    (:5432)     |
                              +------------+     +----------------+
```

## Features

- **FastAPI Async Core**: Async database queries via SQLAlchemy 2.0 and `asyncpg`.
- **Redis Cache Layer**:
  - `items:all` cache with sub-millisecond retrieval.
  - `items:{id}` single-item caching.
  - Dynamic `cache_hit` flag and `latency_ms` tracking in API responses.
  - `X-Cache: HIT` / `X-Cache: MISS` HTTP response headers.
  - Automatic cache invalidation on `POST`, `PUT`, and `DELETE`.
  - Manual cache flushing via `POST /api/cache/clear`.
  - Real-time cache metrics via `GET /api/cache/stats`.
- **PostgreSQL Persistence**: Robust relational storage with automatic schema initialization and initial seed data.
- **Docker Compose**: One-command orchestration with healthchecks and container dependency management.

---

## API Endpoints

| Method | Endpoint | Description | Cache Behavior |
| --- | --- | --- | --- |
| `GET` | `/health` | Healthcheck for DB and Redis | None |
| `GET` | `/api/items` | Fetch all items | Returns cached if available (`X-Cache: HIT`), queries DB on miss (`X-Cache: MISS`) |
| `GET` | `/api/items/{id}` | Fetch single item | Returns cached if available (`X-Cache: HIT`), queries DB on miss (`X-Cache: MISS`) |
| `POST` | `/api/items` | Create new item | Invalidates `items:all` cache |
| `PUT` | `/api/items/{id}` | Update item | Invalidates `items:all` and `items:{id}` |
| `DELETE` | `/api/items/{id}` | Delete item | Invalidates `items:all` and `items:{id}` |
| `POST` | `/api/cache/clear` | Flush items cache | Deletes all `items:*` keys from Redis |
| `GET` | `/api/cache/stats` | Cache stats | Returns total keys count and connection state |

---

## Running with Docker Compose

To start all services (PostgreSQL, Redis, FastAPI backend, and React frontend):

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000 (and http://localhost:5173)
- **FastAPI Swagger Docs**: http://localhost:8000/docs
- **Healthcheck**: http://localhost:8000/health

To run in detached mode:
```bash
docker compose up -d
```

To stop services:
```bash
docker compose down -v
```

---

## Local Development (Without Docker)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup & Testing

```bash
cd frontend
npm install
npm run dev      # Launch dev server on http://localhost:3000
npm run test     # Run Vitest automated unit & integration test suite
npm run build    # Compile production TypeScript & Tailwind bundle
```

---

## Automated Testing

### Frontend Tests (Vitest + React Testing Library)
Run the frontend test suite verifying cache hit/miss badges, latency indicators, form submissions, and API error resilience:
```bash
cd frontend
npm run test
```

### Backend Tests (Pytest + AsyncClient)
Run the backend test suite verifying asynchronous CRUD, cache-aside logic, TTL, and cache invalidation:
```bash
cd backend
pytest
```

---

## Interactive Cache-Aside Demonstration
1. **Initial Page Load**: Items are retrieved from PostgreSQL. The UI displays **🐢 CACHE MISS** and shows the database retrieval latency (~20-100 ms).
2. **Repeated Fetch / Refresh**: Click the **Refresh** button. Data is returned directly from Redis memory. The UI displays **⚡ CACHE HIT** with sub-millisecond retrieval latency (~1-5 ms).
3. **Automated Benchmark**: Click **"Run Cache-Miss vs Cache-Hit Test"** in the top banner. The app automatically invalidates the cache, performs an initial read (Cache Miss), performs a subsequent read (Cache Hit), and computes the exact performance multiplier.
4. **Cache Invalidation on Mutation**: Add, edit, or delete an item. The backend updates PostgreSQL and immediately flushes the relevant Redis cache keys (`items:all` and `items:{id}`). The subsequent read will correctly register as a Cache Miss before being cached again.

