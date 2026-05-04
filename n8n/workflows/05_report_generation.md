# Workflow 5 — Report Generation

## Trigger
**Webhook** → `POST /webhook/report-generation`

Payload from FastAPI:
```json
{
  "tender_id": "uuid",
  "include_audit_trail": true
}
```

## Node Sequence

### Node 1: Webhook Trigger
- **Type**: Webhook
- **Path**: `report-generation`

### Node 2: Fetch Tender Metadata
- **Type**: HTTP Request
- **URL**: `http://backend:8000/api/v1/tenders/{{$json.tender_id}}`

### Node 3: Fetch All Bidders
- **Type**: HTTP Request
- **URL**: `http://backend:8000/api/v1/tenders/{{$json.tender_id}}/bidders`

### Node 4: Fetch All Criteria
- **Type**: HTTP Request
- **URL**: `http://backend:8000/api/v1/criteria?tender_id={{$json.tender_id}}`

### Node 5: Fetch All Verdicts
- **Type**: HTTP Request
- **URL**: `http://backend:8000/api/v1/verdicts?tender_id={{$json.tender_id}}`

### Node 6: Fetch All Evidence
- **Type**: HTTP Request
- **URL**: `http://backend:8000/api/v1/evidence?tender_id={{$json.tender_id}}`

### Node 7: Build Report Prompt (Code)
- **Type**: Code (JavaScript)
- Assemble all data into a structured prompt for the LLM
- Include: tender info, per-bidder verdict cards, criterion details, evidence summaries

### Node 8: Generate Report (OpenAI Chat)
- **Type**: OpenAI (Chat Completion)
- **Model**: `ai/mistral-7b-instruct-q4`
- **System Prompt**: Use `prompts/report_generation_system.txt`
- **User Prompt**: Use `prompts/report_generation_user.txt` with assembled data
- **Temperature**: 0.2
- **Max Tokens**: 8000

### Node 9: Parse Report JSON (Code)
- **Type**: Code (JavaScript)
- Strip markdown fences, parse JSON
- Expected shape:
```json
{
  "title": "Tender Evaluation Report",
  "summary": "...",
  "bidder_cards": [...],
  "audit_references": [...]
}
```

### Node 10: Build HTML (Code)
- **Type**: Code (JavaScript)
- Convert the structured report JSON into styled HTML
- Use inline CSS (WeasyPrint doesn't support external CSS well)
- Include government letterhead header, tables, verdict badges

### Node 11: POST HTML to FastAPI for PDF Rendering
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `http://backend:8000/api/v1/webhooks/report-ready`
- **Body**: `{ "tender_id": "...", "html_content": "<html>..." }`
- FastAPI renders it to PDF via WeasyPrint

---

## Top 2 Failure Points

### 1. LLM output too long → truncated JSON
**Symptom**: Report JSON is cut off mid-sentence.
**Quick fix**: Increase max_tokens to 8000. If the tender has many
bidders/criteria, generate per-bidder sections separately and merge.
**Fallback**: Skip the LLM entirely — build the report from raw data
in the Code node (Node 10). Less narrative, but guaranteed to work.

### 2. WeasyPrint fails on complex HTML
**Symptom**: FastAPI returns 500 on the render-pdf endpoint.
**Quick fix**: Keep HTML simple — use `<table>`, `<p>`, `<h2>`.
Avoid flexbox/grid (WeasyPrint has limited CSS3 support).
Use inline styles everywhere.
**n8n gotcha**: The HTML string must be properly escaped when sent as
JSON. Use `JSON.stringify()` in the Code node to handle special chars.
