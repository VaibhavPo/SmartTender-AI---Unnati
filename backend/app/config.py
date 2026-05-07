"""
Configuration — Pydantic Settings
==================================
All environment variables in one place. Pydantic Settings reads from
.env automatically in dev. In Docker, Compose passes them via the
environment block.

Why Pydantic Settings over raw os.environ:
- Type validation at startup — you find missing vars before the first
  request, not when a user uploads a PDF.
- IDE autocompletion — `settings.QDRANT_HOST` instead of os.environ["QDRANT_HOST"].
- Default values documented right next to the field.
"""

from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── PostgreSQL ──
    DATABASE_URL: str = "postgresql+asyncpg://smarttender:smarttender_dev@postgres:5432/smarttender"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        """
        Railway injects DATABASE_URL as 'postgresql://...' (the standard
        libpq form). SQLAlchemy's async engine requires an explicit async
        driver in the scheme. Rewrite bare postgresql:// → postgresql+asyncpg://
        so the app starts regardless of how the env var is set.
        """
        if v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

    # ── Redis ──
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    # ── Qdrant ──
    QDRANT_HOST: str = "qdrant"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "tender_docs"
    QDRANT_VECTOR_SIZE: int = 768

    # ── Docker Model Runner ──
    MODEL_RUNNER_BASE_URL: str = "http://model-runner.docker.internal/engines/llama.cpp/v1"

    # ── Docling ──
    DOCLING_HOST: str = "docling"
    DOCLING_PORT: int = 8001

    # ── CORS ──
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5178,http://localhost:3000"

    # ── File paths ──
    UPLOAD_DIR: str = "/app/uploads"
    REPORT_DIR: str = "/app/reports"

    # ── Logging ──
    LOG_LEVEL: str = "INFO"

    # ── n8n ──
    N8N_WEBHOOK_BASE_URL: str = "http://n8n:5678/webhook"

    class Config:
        # Look for .env in the project root (two levels up from this file)
        env_file = str(Path(__file__).resolve().parent.parent.parent / ".env")
        env_file_encoding = "utf-8"
        # Allow extra env vars without erroring — Docker passes many
        extra = "ignore"


settings = Settings()

