"""
Database — Async SQLAlchemy Setup
=================================
Uses asyncpg for non-blocking I/O. The engine is created once and
shared across the app. Sessions are created per-request via the
dependency injection pattern.

Why async:
- FastAPI is async. If your DB calls are sync, you block the event
  loop and your upload endpoint freezes while a query runs.
- asyncpg is the fastest pure-Python PG driver by a wide margin.

Gotcha: Alembic migrations run synchronously. That's fine — they're
CLI operations, not request handlers.
"""

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# ──────────────────────────────────────────────
# Engine — pool_size=5 is fine for a hackathon.
# In production, tune based on container CPU count.
# ──────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,          # Set to True to see SQL in logs (noisy)
    pool_size=5,
    max_overflow=10,
)

# ──────────────────────────────────────────────
# Session factory — expire_on_commit=False so
# returned objects are usable after commit.
# ──────────────────────────────────────────────
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ──────────────────────────────────────────────
# Base class for all ORM models
# ──────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ──────────────────────────────────────────────
# Dependency — inject into route handlers
# Usage:
#   async def get_tender(db: AsyncSession = Depends(get_db)):
# ──────────────────────────────────────────────
async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
