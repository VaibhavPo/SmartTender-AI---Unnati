"""
Health Check Router
===================
GET /health — checks PostgreSQL, Qdrant, and Docker Model Runner.

Called by: Docker Compose health check, React frontend, monitoring.

This is the first thing you hit after `docker compose up` to verify
everything is wired correctly. If any dependency is down, this returns
503 with a clear message about WHAT is down.
"""

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    GET /health — called by Docker, React, and you at 3am.

    Checks:
    1. PostgreSQL — can we run a simple query?
    2. Qdrant — is the REST API responding?
    3. Docker Model Runner — is the OpenAI-compatible endpoint reachable?

    Returns 200 if all healthy, 503 if any dependency is down.
    Each dependency reports its own status so you know exactly what broke.
    """
    checks = {}

    # ── PostgreSQL ──
    try:
        await db.execute(text("SELECT 1"))
        checks["postgres"] = {"status": "healthy"}
    except Exception as e:
        checks["postgres"] = {"status": "unhealthy", "error": str(e)}

    # ── Qdrant ──
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"http://{settings.QDRANT_HOST}:{settings.QDRANT_PORT}/healthz")
            if resp.status_code == 200:
                checks["qdrant"] = {"status": "healthy"}
            else:
                checks["qdrant"] = {"status": "unhealthy", "error": f"HTTP {resp.status_code}"}
    except Exception as e:
        checks["qdrant"] = {"status": "unhealthy", "error": str(e)}

    # ── Docker Model Runner ──
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.MODEL_RUNNER_BASE_URL}/models")
            if resp.status_code == 200:
                checks["model_runner"] = {"status": "healthy"}
            else:
                checks["model_runner"] = {"status": "unhealthy", "error": f"HTTP {resp.status_code}"}
    except Exception as e:
        checks["model_runner"] = {
            "status": "unhealthy",
            "error": str(e),
            "hint": "Is Docker Model Runner enabled in Docker Desktop Settings → Features?"
        }

    # Overall status - model_runner is required for local embeddings
    critical_checks = ["postgres", "qdrant", "model_runner"]
    all_healthy = all(checks[k]["status"] == "healthy" for k in critical_checks if k in checks)
    status_code = 200 if all_healthy else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "checks": checks,
        },
    )
