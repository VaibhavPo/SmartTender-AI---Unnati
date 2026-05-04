# SmartTender AI

**AI-assisted tender evaluation platform for government procurement.**
Built for the CRPF Hackathon, Theme 3.

> An officer uploads a tender PDF and bidder submissions. The system
> extracts evaluation criteria, finds evidence in each bidder's documents,
> renders pass/fail verdicts with reasoning, and generates a signed PDF
> report — all with full audit trail.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   React UI   │────▶│  FastAPI API  │────▶│      PostgreSQL      │
│  (Tailwind)  │◀────│  (thin CRUD)  │◀────│  (append-only audit) │
└──────────────┘     └──────┬───────┘     └─────────────────────┘
                            │ webhooks
                            ▼
                     ┌──────────────┐
                     │     n8n      │──── Docker Model Runner
                     │ (AI workflows│     (mistral-7b, nomic,
                     │  orchestrator)│      llava-7b)
                     └──────┬───────┘
                            │ HTTP
                     ┌──────┴───────┐
                     │   Docling    │     ┌──────────┐
                     │  (OCR svc)   │     │  Qdrant  │
                     └──────────────┘     │ (vectors)│
                                          └──────────┘
```

**Strict three-way separation:**
- **FastAPI** → CRUD only. Zero AI logic. Receives files, stores data, triggers n8n.
- **n8n** → All AI workflows. Calls LLMs, Docling, Qdrant via HTTP/OpenAI nodes.
- **React** → Display only. Upload docs, review criteria, confirm verdicts.

---

## Quick Start

### Prerequisites
- Docker Desktop with **Docker Model Runner** enabled
  (Settings → Features in development → Docker Model Runner)
- 16 GB RAM minimum (see Low RAM section below)

### 1. Pull AI Models (run once)
```bash
# Main LLM — criteria, evidence, verdicts (~4.1 GB download)
docker model pull ai/mistral-7b-instruct-q4

# Embeddings for vector search (~275 MB download)
docker model pull ai/nomic-embed-text

# Vision model for scanned documents (~4.5 GB download)
docker model pull ai/llava-7b
```

**Total download: ~8.9 GB. Runtime RAM for all three: ~10-12 GB.**

### 2. Start Services
```bash
cp .env.example .env    # Review and adjust if needed
docker compose up -d    # Start all services
```

### 3. Verify
```bash
# Check all services are healthy
curl http://localhost:8000/health

# Access UIs
# FastAPI docs: http://localhost:8000/docs
# n8n workflows: http://localhost:5678 (admin / smarttender_n8n)
# React frontend: http://localhost:5173 (in dev) or build with Docker
```

### ⚠️ Low RAM Workaround (< 16 GB)

If your machine has less than 16 GB RAM:

1. **Skip llava-7b** — don't pull it. The system falls back to Docling-only OCR.
   Comment out `MODEL_VISION` in `.env`.
2. **Run models sequentially** — Docker Model Runner loads models on-demand and
   unloads idle ones. With <16 GB, only one model fits at a time. This means
   workflows run slower (each model swap takes 5-10s) but it works.
3. **Reduce PostgreSQL shared_buffers** — add to compose:
   ```yaml
   postgres:
     command: postgres -c shared_buffers=128MB
   ```

**Minimum viable RAM: 8 GB** (mistral + nomic only, no llava, models swap in/out).

---

## Folder Structure

```
SmartTender AI - Unnati/
│
├── backend/                        # FastAPI — thin API layer
│   ├── Dockerfile                  # Multi-stage Python build with WeasyPrint deps
│   ├── requirements.txt            # Pinned Python dependencies
│   ├── alembic.ini                 # DB migration config (sync psycopg2 driver)
│   ├── alembic/
│   │   ├── env.py                  # Imports all ORM models for autogenerate
│   │   ├── script.py.mako          # Migration script template
│   │   └── versions/               # Auto-generated migration files
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # App factory: lifespan, CORS, router mounting
│       ├── config.py               # Pydantic Settings — all env vars in one place
│       ├── database.py             # Async SQLAlchemy engine + session factory
│       ├── models/
│       │   ├── __init__.py         # Re-exports all schemas + ORM models
│       │   ├── schemas.py          # 6 Pydantic models + request/response wrappers
│       │   └── db_models.py        # SQLAlchemy ORM — append-only audit tables
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── health.py           # GET /health — checks PG + Qdrant + Model Runner
│       │   ├── tenders.py          # CRUD tenders + bidders
│       │   ├── documents.py        # Upload files, trigger n8n ingestion
│       │   ├── criteria.py         # CRUD criteria, trigger extraction + evaluation
│       │   ├── evidence.py         # Read evidence (written by n8n)
│       │   ├── verdicts.py         # Read verdicts, officer override (append-only)
│       │   ├── reports.py          # Trigger report gen, download PDF, render HTML→PDF
│       │   └── webhooks.py         # Inbound callbacks from n8n (5 endpoints)
│       └── services/
│           ├── __init__.py
│           ├── n8n_client.py       # httpx wrapper to trigger n8n webhooks
│           └── storage.py          # File storage (Docker volume in dev)
│
├── frontend/                       # React + Tailwind v3
│   ├── Dockerfile                  # Multi-stage: Node build → nginx serve
│   ├── package.json
│   ├── tailwind.config.js          # Custom color palette + animations
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx                # Entry point
│       ├── index.css               # Tailwind base + glassmorphism design system
│       ├── App.jsx                 # Router + sidebar navigation (5 routes)
│       ├── api/
│       │   └── client.js           # Axios instance + typed API methods
│       ├── pages/
│       │   ├── UploadPage.jsx      # Create tender, add bidders, upload docs
│       │   ├── CriteriaReviewPage.jsx  # Review/edit AI-extracted criteria
│       │   ├── EvaluationDashboardPage.jsx  # Live scorecards per bidder
│       │   ├── ManualReviewPage.jsx    # MANUAL_REVIEW queue with override
│       │   └── ReportPage.jsx      # Generate + download PDF report
│       └── components/
│           ├── FileUploader.jsx    # Drag-and-drop with bidder assignment
│           ├── CriterionCard.jsx   # Editable criterion with inline edit mode
│           ├── VerdictBadge.jsx    # Color-coded PASS/FAIL/REVIEW badges
│           └── StatusBadge.jsx     # Document processing status indicator
│
├── docling/                        # OCR microservice
│   ├── Dockerfile                  # Python slim + PDF/image system deps
│   ├── requirements.txt            # docling + fastapi + pillow
│   └── main.py                     # POST /extract → structured page blocks
│
├── n8n/                            # AI workflow documentation
│   ├── README.md                   # Setup guide, credentials, webhook gotchas
│   └── workflows/
│       ├── 01_document_ingestion.md    # PDF → Docling → vectors → DB
│       ├── 02_criteria_extraction.md   # Tender text → mistral → criteria JSON
│       ├── 03_evidence_extraction.md   # Criteria × bidders → RAG → evidence
│       ├── 04_verdict_engine.md        # Rules + LLM → PASS/FAIL/REVIEW
│       └── 05_report_generation.md     # All data → report JSON → PDF
│
├── prompts/                        # LLM prompt templates
│   ├── criteria_extraction_system.txt  # JSON-only schema enforcement
│   ├── criteria_extraction_user.txt    # Tender text injection
│   ├── evidence_extraction_system.txt  # Grounded extraction rules
│   ├── evidence_extraction_user.txt    # Criterion + context chunks
│   ├── verdict_reasoning_system.txt    # Tristate PASS/FAIL/MANUAL_REVIEW
│   ├── verdict_reasoning_user.txt      # Evidence + ambiguity reason
│   ├── report_generation_system.txt    # Formal report structure
│   ├── report_generation_user.txt      # All evaluation data
│   ├── vision_ocr_fallback.txt         # LLaVA prompt for scanned pages
│   └── strip_markdown_fences.py        # Utility: strip ```json from LLM output
│
├── .github/workflows/
│   ├── ci.yml                      # Lint, type-check, build on push
│   └── deploy-frontend.yml         # Deploy to Cloudflare Pages on prod push
│
├── docker-compose.yml              # All services except Docker Model Runner
├── .env.example                    # Every env var, grouped, commented
├── .gitignore                      # Python + Node + Docker
├── LICENSE
└── README.md                       # You are here
```

---

## API Router Layout

### `health.py`
| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| GET | `/health` | Check PG + Qdrant + Model Runner | Docker, React, monitoring |

### `tenders.py`
| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| POST | `/api/v1/tenders` | Create new tender | React |
| GET | `/api/v1/tenders` | List all tenders | React |
| GET | `/api/v1/tenders/{id}` | Get tender details | React, n8n |
| POST | `/api/v1/tenders/{id}/bidders` | Add bidder | React |
| GET | `/api/v1/tenders/{id}/bidders` | List bidders | React, n8n |

### `documents.py`
| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| POST | `/api/v1/documents/upload` | Upload PDF/image, trigger ingestion | React |
| GET | `/api/v1/documents/{id}` | Get document + SDO | n8n, React |
| GET | `/api/v1/documents` | List docs (filter by tender/bidder) | React, n8n |

### `criteria.py`
| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| POST | `/api/v1/criteria/extract` | Trigger AI criteria extraction | React |
| GET | `/api/v1/criteria` | List criteria for tender | React, n8n |
| PUT | `/api/v1/criteria/{id}` | Edit criterion | React |
| POST | `/api/v1/criteria/confirm` | Confirm & start evaluation | React |

### `evidence.py`
| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| GET | `/api/v1/evidence` | List evidence (filter by tender/bidder/criterion) | React, n8n |
| GET | `/api/v1/evidence/{id}` | Get single evidence detail | React |

### `verdicts.py`
| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| GET | `/api/v1/verdicts` | List latest verdicts | React, n8n |
| POST | `/api/v1/verdicts/override` | Officer override (append-only) | React |

### `reports.py`
| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| POST | `/api/v1/reports/generate` | Trigger report generation | React |
| GET | `/api/v1/reports/{id}/download` | Download PDF | React |
| POST | `/api/v1/reports/render-pdf` | Render HTML → PDF | n8n |

### `webhooks.py` (n8n callbacks)
| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| POST | `/api/v1/webhooks/ingestion-complete` | Workflow 1 result | n8n |
| POST | `/api/v1/webhooks/criteria-extracted` | Workflow 2 result | n8n |
| POST | `/api/v1/webhooks/evidence-extracted` | Workflow 3 result | n8n |
| POST | `/api/v1/webhooks/verdict-rendered` | Workflow 4 result | n8n |
| POST | `/api/v1/webhooks/report-ready` | Workflow 5 result | n8n |

---

## React Screens

| # | Screen | Key Components | API Calls |
|---|--------|---------------|-----------|
| 1 | **Upload** | TenderForm, BidderList, FileUploader | POST /tenders, POST /bidders, POST /documents/upload |
| 2 | **Criteria Review** | CriterionCard (editable) | POST /criteria/extract, GET /criteria, PUT /criteria/{id}, POST /criteria/confirm |
| 3 | **Evaluation Dashboard** | BidderScoreCard, VerdictBadge, ProgressBar | GET /verdicts, GET /criteria, GET /bidders (auto-refresh 10s) |
| 4 | **Manual Review** | ReviewCard, OverrideModal | GET /verdicts (filter MANUAL_REVIEW), POST /verdicts/override |
| 5 | **Report** | RankingTable, DownloadButton | POST /reports/generate, GET /reports/{id}/download |

---

## End-to-End Walkthrough

A procurement officer opens the SmartTender AI web portal and creates a new
tender by entering the tender name and reference number. They upload the tender
notice PDF — the React frontend sends it to FastAPI, which saves the file to
disk and fires a webhook to n8n. The n8n Document Ingestion workflow picks it
up, sends the PDF to the Docling microservice for text extraction, checks if
any pages have low OCR confidence (and if so, sends those pages to the LLaVA
vision model for a second pass), then embeds every text block using the
nomic-embed-text model and stores the vectors in Qdrant. Once done, n8n posts
the structured document back to FastAPI, which saves it in PostgreSQL.

The officer then registers each bidder company and uploads their submission
documents — the same ingestion pipeline runs for each. When all documents are
processed, the officer clicks "Extract Criteria." React calls FastAPI, FastAPI
fires the Criteria Extraction webhook to n8n, which fetches the tender document
text, sends it to mistral-7b-instruct with a carefully crafted prompt that
enforces JSON output, parses the result (stripping the markdown fences the model
inevitably adds), and posts the structured criteria back to FastAPI.

The officer reviews the AI-extracted criteria in the React UI — they can edit
names, adjust thresholds, change types, or add missing criteria. When satisfied,
they click "Start Evaluation." React sends the confirmed criteria and bidder
list to FastAPI, which triggers the Evidence Extraction workflow in n8n. For
each bidder × criterion pair, n8n embeds the criterion description, searches
Qdrant for the most relevant text chunks from that bidder's documents, feeds
those chunks to mistral-7b-instruct with an extraction prompt, and posts the
extracted evidence back to FastAPI.

Once all evidence is extracted, n8n automatically triggers the Verdict Engine.
For each piece of evidence, it first runs simple deterministic rules — comparing
numbers to thresholds, checking date validity, verifying boolean presence. If
the rules give a clear answer and the evidence confidence is high, the verdict
is assigned directly without touching the LLM. For ambiguous cases, it calls
mistral-7b-instruct for semantic reasoning. Any case where the model's
confidence is below 0.60 or where no evidence was found gets flagged as
MANUAL_REVIEW.

Back in the React dashboard, the officer sees live scorecards for each bidder —
color-coded pass rates, progress bars, per-criterion verdict badges
auto-refreshing every 10 seconds. Items flagged for manual review appear in a
dedicated queue where the officer can see the AI's reasoning, view the source
evidence with page numbers, and override with their own judgment (typing a
mandatory justification that goes into the append-only audit trail).

When all verdicts are settled, the officer clicks "Generate Report." n8n
fetches all the data, feeds it to mistral-7b-instruct to generate a structured
report with executive summary and per-bidder assessment cards, converts it to
HTML, and sends it to FastAPI where WeasyPrint renders the final PDF. The
officer downloads the report — and every decision, every override, every AI
inference is traceable in the audit log.

---

## Hackathon vs Production

| Area | Hackathon (now) | Production (later) |
|------|----------------|-------------------|
| Auth | None | JWT + RBAC, officer login |
| File storage | Docker volume | S3/MinIO |
| DB access | Auto-create tables | Alembic migrations only |
| Audit immutability | Convention (no UPDATE calls) | DB policy: REVOKE UPDATE/DELETE |
| PDF signing | No signature | Digital signature with officer cert |
| Rate limiting | None | Redis-based per-endpoint |
| Model hosting | Docker Model Runner (local) | vLLM or TGI on GPU server |
| Frontend deploy | Local dev server | Cloudflare Pages |
| Monitoring | Console logs | Prometheus + Grafana |

---

## License

MIT
