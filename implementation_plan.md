# SmartTender AI — Full Project Scaffold

## Goal

Scaffold the entire SmartTender AI project from an empty repo into a fully structured, Docker-Compose-ready monorepo. Every file will be real, runnable code or config — not stubs. The scaffold should let a junior dev clone the repo, run `docker compose up`, pull the models, and have a working dev environment.

## Proposed Changes

The scaffold is organized into 6 phases, executed sequentially because later phases depend on earlier ones.

---

### Phase 1: Project Root & Infrastructure

Root-level config files, Docker Compose, environment template, and the Docling microservice.

#### [NEW] `README.md`
Master README with setup instructions, architecture diagram (Mermaid), Docker Model Runner pull commands with sizes and RAM guidance, and the end-to-end walkthrough.

#### [NEW] `docker-compose.yml`
Production-quality Compose file with services: `postgres`, `redis`, `qdrant`, `n8n`, `docling`, `backend`. Health checks, named volumes, `depends_on` with `service_healthy`, `${VAR:-default}` env vars. Header comment about Docker Model Runner.

#### [NEW] `.env.example`
Every env var grouped by service, commented with purpose and dev-safe defaults.

#### [NEW] `.gitignore`
Python + Node + Docker ignores.

#### [NEW] `docling/Dockerfile`
Builds the Docling OCR microservice (FastAPI wrapper around the `docling` Python package).

#### [NEW] `docling/requirements.txt`
Dependencies for the Docling microservice.

#### [NEW] `docling/main.py`
Minimal FastAPI app that exposes `POST /extract` for PDF/image OCR. Returns structured page blocks with confidence scores.

---

### Phase 2: Backend (FastAPI)

The thin API layer — receives files, stores data, serves the frontend. Zero AI logic.

#### [NEW] `backend/Dockerfile`
Multi-stage Python Dockerfile.

#### [NEW] `backend/requirements.txt`
FastAPI, uvicorn, SQLAlchemy, asyncpg, psycopg2-binary, alembic, pydantic, python-multipart, httpx, weasyprint, redis, etc.

#### [NEW] `backend/app/__init__.py`
Package init.

#### [NEW] `backend/app/main.py`
FastAPI app factory with lifespan, CORS, router mounting, and the `/health` endpoint.

#### [NEW] `backend/app/config.py`
Pydantic Settings for all env vars.

#### [NEW] `backend/app/database.py`
Async SQLAlchemy engine + session factory.

#### [NEW] `backend/app/models/` (directory)
- `__init__.py` — re-exports all models
- `schemas.py` — All 6 Pydantic models (StructuredDocumentObject, PageBlock, CriterionSchema, EvidenceObject, VerdictRecord, AuditEvent) with full field comments
- `db_models.py` — SQLAlchemy ORM models mirroring the Pydantic schemas, append-only audit tables

#### [NEW] `backend/app/routers/` (directory)
- `__init__.py`
- `health.py` — `GET /health` (checks pg + qdrant + model-runner)
- `tenders.py` — CRUD for tenders
- `documents.py` — Upload + retrieve documents, triggers n8n ingestion webhook
- `criteria.py` — CRUD for criteria registry, trigger extraction
- `evidence.py` — CRUD for evidence objects
- `verdicts.py` — CRUD for verdict records
- `reports.py` — Generate + download reports
- `webhooks.py` — Inbound endpoints for n8n to POST results back

#### [NEW] `backend/app/services/` (directory)
- `__init__.py`
- `n8n_client.py` — Thin httpx wrapper to trigger n8n webhooks
- `storage.py` — File storage (local volume in dev)

#### [NEW] `backend/alembic/` (directory)
Alembic migration setup with `env.py` and initial migration.

#### [NEW] `backend/alembic.ini`
Alembic config pointing to the async DB URL.

---

### Phase 3: Frontend (React + Tailwind)

Initialized with Vite. Five screens, shared components, API client.

#### [NEW] `frontend/` (Vite React app)
Created via `npx -y create-vite@latest ./ --template react`. Then Tailwind installed.

Key files:
- `src/App.jsx` — Router with 5 routes
- `src/api/client.js` — Axios instance with base URL
- `src/pages/UploadPage.jsx`
- `src/pages/CriteriaReviewPage.jsx`
- `src/pages/EvaluationDashboardPage.jsx`
- `src/pages/ManualReviewPage.jsx`
- `src/pages/ReportPage.jsx`
- `src/components/` — Shared UI components (FileUploader, CriterionCard, VerdictBadge, BidderScoreCard, etc.)
- `Dockerfile` — Nginx-based prod build

---

### Phase 4: n8n Workflow Documentation

n8n workflows are JSON files imported via the UI, but we document them thoroughly.

#### [NEW] `n8n/README.md`
Overview of all 5 workflows, how to import them, webhook URL format, credentials setup.

#### [NEW] `n8n/workflows/` (directory)
- `01_document_ingestion.md` — Node sequence, failure points, fixes
- `02_criteria_extraction.md` — Node sequence, failure points, fixes
- `03_evidence_extraction.md` — Node sequence, failure points, fixes
- `04_verdict_engine.md` — Node sequence, failure points, fixes
- `05_report_generation.md` — Node sequence, failure points, fixes

---

### Phase 5: Prompt Templates

Actual prompt text files used by the n8n workflows when calling mistral-7b-instruct.

#### [NEW] `prompts/` (directory)
- `criteria_extraction_system.txt`
- `criteria_extraction_user.txt`
- `evidence_extraction_system.txt`
- `evidence_extraction_user.txt`
- `verdict_reasoning_system.txt`
- `verdict_reasoning_user.txt`
- `report_generation_system.txt`
- `report_generation_user.txt`
- `vision_ocr_fallback.txt` (llava prompt)
- `strip_markdown_fences.py` — Utility to strip ```json fences from LLM output

---

### Phase 6: CI/CD & Infra

#### [NEW] `.github/workflows/ci.yml`
GitHub Actions: lint, type-check, test backend, build frontend.

#### [NEW] `.github/workflows/deploy-frontend.yml`
Deploy frontend to Cloudflare Pages on push to `prod` branch.

---

## User Review Required

> [!IMPORTANT]
> **Tailwind CSS version**: You specified React + Tailwind. I'll use **Tailwind CSS v4** (latest) with the Vite plugin. Let me know if you prefer v3.

> [!IMPORTANT]
> **Database migrations**: I'll include Alembic setup with an initial migration that creates all tables. The audit tables will be append-only (no UPDATE/DELETE policies). Good for hackathon, but for production you'd add row-level security.

> [!WARNING]  
> **n8n workflow JSONs**: I will NOT generate actual n8n workflow JSON export files — those are huge, brittle, and better created in the n8n UI. Instead, I'll create detailed markdown docs for each workflow with exact node types, config, and the node sequence. You build them in the GUI following the docs. This is faster and less error-prone.

## Open Questions

1. **PostgreSQL version**: I'll default to PostgreSQL 16. Any preference?
2. **Redis usage**: Your spec doesn't mention Redis explicitly, but it's useful for rate limiting, caching, and as an n8n queue backend. Should I include it or drop it to save RAM?
3. **File storage**: For uploaded PDFs, should I use a Docker volume (simplest) or do you want MinIO/S3-compatible storage?
4. **Frontend auth**: Any authentication needed for the officer UI, or is this open access for the hackathon?

## Verification Plan

### Automated Tests
- `docker compose config` — validates the compose file
- `docker compose up --build` — all services start and pass health checks
- Backend: `pytest` smoke test hitting `/health`
- Frontend: `npm run build` succeeds without errors

### Manual Verification
- Walk through the README setup steps on a fresh clone
- Verify all imports resolve, no missing files
- Confirm Docker Model Runner endpoint is reachable from inside a container
