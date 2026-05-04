# n8n Workflows — SmartTender AI

## Overview

All AI logic lives in n8n. There are 5 workflows, each triggered by a webhook
from the FastAPI backend. n8n processes the data using Docker Model Runner
(OpenAI-compatible API) and sends results back to FastAPI via webhook callbacks.

## Setup

### 1. Access n8n
After `docker compose up`, open http://localhost:5678.
Login: `admin` / `smarttender_n8n` (from `.env`).

### 2. Create OpenAI Credentials
Go to **Settings → Credentials → Add → OpenAI API**.
- API Key: (any non-empty string, e.g., `not-needed`)
- Base URL: `http://model-runner.docker.internal/engines/llama.cpp/v1`

> ⚠️ **Gotcha**: Docker Model Runner doesn't need an API key, but n8n's OpenAI
> node requires one. Put any string there — it's ignored.

### 3. Webhook URL Format
n8n webhook triggers are at: `http://n8n:5678/webhook/<path>`
- In production mode, the path is whatever you set in the trigger node
- In test mode, it's at `http://n8n:5678/webhook-test/<path>`
- FastAPI calls the production URL

> ⚠️ **Gotcha**: If you're testing via the n8n UI "Execute Workflow" button,
> you must use the **test webhook URL**. Production webhooks only work when
> the workflow is **active** (toggled on).

### 4. Import Order
Build workflows in this order (they reference each other):
1. Document Ingestion
2. Criteria Extraction
3. Evidence Extraction
4. Verdict Engine
5. Report Generation

## Workflow Details
See individual files in `workflows/` for node-by-node breakdowns.
