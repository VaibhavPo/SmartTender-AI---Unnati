# SmartTender AI — Scaffold Walkthrough

## What Was Built

**82 files** across 6 phases, creating a fully structured monorepo ready for development.

### Phase 1: Infrastructure (7 files)
- `docker-compose.yml` — 6 services (postgres, redis, qdrant, n8n, docling, backend) with health checks, named volumes, and sensible defaults. Docker Model Runner intentionally excluded — it's a Desktop daemon.
- `.env.example` — every variable grouped by service, commented with `[DEV-SAFE]` markers
- `.gitignore` — Python + Node + Docker + OS ignores
- `docling/` — complete OCR microservice: Dockerfile, requirements, FastAPI app with `/extract` and `/health` endpoints

### Phase 2: Backend (20 files)
- **6 Pydantic models** with exhaustive field comments: `StructuredDocumentObject`, `PageBlock`, `CriterionSchema`, `EvidenceObject`, `VerdictRecord`, `AuditEvent`
- **7 SQLAlchemy ORM tables** with composite indexes, JSONB columns, and append-only audit tables
- **8 router files** with 22 endpoints total covering CRUD, file upload, n8n webhook triggers, and inbound callbacks
- **Alembic** migration setup with env.py importing all models

### Phase 3: Frontend (14 files)
- Vite + React scaffolded with Tailwind v3
- Custom dark glassmorphism design system with government-trust color palette
- 5 pages: Upload, Criteria Review, Evaluation Dashboard, Manual Review, Report
- 4 shared components: FileUploader (drag-and-drop), CriterionCard (inline edit), VerdictBadge, StatusBadge
- Centralized API client with typed convenience methods for every endpoint
- Multi-stage Dockerfile (Node build → nginx serve)

### Phase 4: n8n Documentation (6 files)
- Setup guide with credentials, webhook URL gotchas
- Node-by-node breakdown of all 5 workflows
- 2 failure points per workflow with quick fixes
- n8n-specific gotchas (auth, webhook test vs prod URLs, timeout settings)

### Phase 5: Prompt Templates (10 files)
- System + user prompt pairs for criteria extraction, evidence extraction, verdict reasoning, and report generation
- Vision OCR fallback prompt for llava-7b
- `strip_markdown_fences.py` utility for cleaning LLM JSON output

### Phase 6: CI/CD (2 files)
- GitHub Actions CI: lint backend, build frontend, validate compose
- Cloudflare Pages deployment on `prod` branch push

---

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Append-only audit tables | Government procurement requires full traceability. Verdicts are never updated — overrides create new rows with version+1. |
| Separate Docling microservice | Isolates heavy ML model loading (~1-2 GB RAM) from the lightweight FastAPI backend. One can crash without affecting the other. |
| n8n for all AI logic | Visual workflow editor lets non-engineers see and tweak the AI pipeline. Easier to debug than Python code at 2am before a demo. |
| Docker Model Runner over Ollama | Native to Docker Desktop, OpenAI-compatible API works with n8n's built-in nodes — zero custom HTTP config. |
| Tailwind v3 (stable) | User preference for stable version over v4 cutting-edge. |
| Redis included | Serves as n8n queue backend for reliability, plus available for caching/rate-limiting in future. |

---

## What Was Tested

- ✅ Vite React app scaffolded and dependencies installed
- ✅ Tailwind v3 initialized with custom config
- ✅ 82 files created with correct directory structure
- ⏳ `docker compose up` — not run (requires Docker Desktop with Model Runner enabled)
- ⏳ Backend Python imports — not verified (requires virtual env or Docker build)

---

## Next Steps

1. **Build and run**: `cp .env.example .env && docker compose up --build`
2. **Pull models**: Run the 3 `docker model pull` commands from the README
3. **Build n8n workflows**: Follow the docs in `n8n/workflows/` to create each workflow in the n8n UI
4. **Test the flow**: Upload a sample tender PDF, extract criteria, run evaluation
5. **Frontend dev**: Run `cd frontend && npm run dev` for hot-reload development
