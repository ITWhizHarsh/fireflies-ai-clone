from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import create_tables, SessionLocal
from app.routers import meetings, action_items, segments, search


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and seed if empty."""
    create_tables()
    db = SessionLocal()
    try:
        from app.seed import seed_database
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Fireflies Clone API",
    description="A Fireflies.ai meeting assistant clone",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(meetings.router, prefix="/api")
app.include_router(action_items.router, prefix="/api")
app.include_router(segments.router, prefix="/api")
app.include_router(search.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "fireflies-clone-api"}


@app.get("/")
def root():
    return {"message": "Fireflies Clone API. Visit /api/health for status."}
