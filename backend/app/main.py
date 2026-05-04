"""
SmartTender AI — FastAPI Application
====================================
This is the thin API layer. It does exactly three things:
1. Accept file uploads and serve data to the React frontend.
2. Store/retrieve data from PostgreSQL.
3. Trigger n8n webhooks when something happens (upload, button click).

There is ZERO AI logic here. No LLM calls, no embeddings, no vector
search. All of that lives in n8n workflows.

Why this separation matters:
- When the LLM pipeline breaks at 2am before a demo, you debug n8n,
  not Python. The API is rock-solid because it's boring CRUD.
- n8n gives you a visual workflow editor — non-engineers on the team
  can see and tweak the AI pipeline without touching code.
- Each layer can be restarted independently without affecting the others.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import (
    health,
    tenders,
    documents,
    criteria,
    evidence,
    verdicts,
    reports,
    webhooks,
    audit,
)

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
)
logger = logging.getLogger("smarttender")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup / shutdown lifecycle.
    
    On startup: create tables if they don't exist (dev convenience).
    In production, you'd rely on Alembic migrations only.
    """
    logger.info("Starting SmartTender AI backend...")

    # Create tables — fine for hackathon. In prod, use alembic only.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured.")

    yield

    logger.info("Shutting down SmartTender AI backend...")
    await engine.dispose()


app = FastAPI(
    title="SmartTender AI",
    description="AI-assisted tender evaluation platform for government procurement",
    version="0.1.0",
    lifespan=lifespan,
)

# ──────────────────────────────────────────────
# CORS — allow the React dev server and
# Cloudflare Pages in production.
# ──────────────────────────────────────────────
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Mount routers — all under /api/v1 prefix.
# Version prefix from day one so the frontend
# URL doesn't break when you add /api/v2 later.
# ──────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(health.router, tags=["Health"])
app.include_router(tenders.router, prefix=API_PREFIX, tags=["Tenders"])
app.include_router(documents.router, prefix=API_PREFIX, tags=["Documents"])
app.include_router(criteria.router, prefix=API_PREFIX, tags=["Criteria"])
app.include_router(evidence.router, prefix=API_PREFIX, tags=["Evidence"])
app.include_router(verdicts.router, prefix=API_PREFIX, tags=["Verdicts"])
app.include_router(reports.router, prefix=API_PREFIX, tags=["Reports"])
app.include_router(webhooks.router, prefix=API_PREFIX, tags=["Webhooks"])
app.include_router(audit.router, prefix=API_PREFIX, tags=["Audit"])
