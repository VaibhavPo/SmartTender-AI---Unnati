# Workflow 2 — Criteria Extraction

## Trigger
**Webhook** → `POST /webhook/criteria-extraction`

Payload from FastAPI:
```json
{
  "tender_id": "uuid",
  "document_id": "uuid"
}
```

## Node Sequence

### Node 1: Webhook Trigger
- **Type**: Webhook
- **Path**: `criteria-extraction`
- **Response Mode**: Immediate ack

### Node 2: Fetch Tender Document
- **Type**: HTTP Request
- **Method**: GET
- **URL**: `http://backend:8000/api/v1/documents/{{$json.document_id}}`
- Returns the StructuredDocumentObject with all page_blocks

### Node 3: Concatenate Text (Code)
- **Type**: Code (JavaScript)
- **Purpose**: Join all page block texts into a single `tender_text` string
```javascript
const doc = $input.first().json;
const blocks = doc.page_blocks || [];
const tender_text = blocks
  .sort((a, b) => a.page_num - b.page_num || a.block_index - b.block_index)
  .map(b => b.text)
  .join('\n\n');

return [{ json: { tender_text, tender_id: doc.tender_id, document_id: doc.id } }];
```

### Node 4: Extract Criteria (OpenAI Chat)
- **Type**: OpenAI (Chat Completion)
- **Model**: `ai/mistral-7b-instruct-q4`
- **System Prompt**: Use `prompts/criteria_extraction_system.txt`
- **User Prompt**: Use `prompts/criteria_extraction_user.txt` with `{{tender_text}}` injected
- **Temperature**: 0.1 (we want deterministic JSON output)
- **Max Tokens**: 4000

### Node 5: Parse & Clean JSON (Code)
- **Type**: Code (JavaScript)
- **Purpose**: Strip markdown fences and parse the JSON array
```javascript
let raw = $input.first().json.message.content;

// Mistral loves wrapping JSON in ```json fences — strip them
raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
raw = raw.trim();

try {
  const criteria = JSON.parse(raw);
  if (!Array.isArray(criteria)) throw new Error('Expected array');
  return [{ json: { criteria, tender_id: $('Node 3').first().json.tender_id } }];
} catch (e) {
  // Return error flag so Node 6 can retry
  return [{ json: { parse_error: true, raw_output: raw, error: e.message } }];
}
```

### Node 6: Retry on Parse Failure (IF)
- **Type**: IF
- **Condition**: `{{$json.parse_error}}` is true
- True → Node 7 (Retry with stricter prompt)
- False → Node 8 (POST to FastAPI)

### Node 7: Retry with Strict Prompt (OpenAI Chat)
- **Type**: OpenAI (Chat Completion)
- **Model**: `ai/mistral-7b-instruct-q4`
- **System Prompt**: Add extra instruction:
  `"Your previous response was invalid JSON. Return ONLY a raw JSON array, no markdown, no explanation, no code fences."`
- **User Prompt**: Same as Node 4 but include the raw output from the failed attempt

### Node 8: Assign UUIDs (Code)
- **Type**: Code (JavaScript)
- **Purpose**: Add UUID and order_index to each criterion; use semantic criterion types directly
```javascript
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const input = $input.first().json;
const criteria = input.criteria || [];
const tender_id = input.tender_id;
const document_id = input.document_id;

const result = criteria.map((c, i) => ({
  id: uuidv4(),
  tender_id,
  name: c.name,
  description: c.description,
  criterion_type: c.criterion_type,                  // ✅ semantic: numeric|date|boolean|text
  threshold_value: c.threshold_value != null ? String(c.threshold_value) : null,
  unit: c.unit ?? null,
  is_mandatory: c.is_mandatory ?? false,
  section_reference: c.section_reference ?? null,
  order_index: i,

  _meta: {
    document_id,
    extracted_by: 'mistral-7b-instruct-q4',
    extracted_at: new Date().toISOString(),
  }
}));

return [{ json: {
  tender_id,
  criteria: result,
  _audit: { document_id, total: result.length }
}}];
```

### Node 9: POST to FastAPI
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `http://backend:8000/api/v1/webhooks/criteria-extracted`
- **Body**: `{ "tender_id": "...", "criteria": [...] }`

---

## Top 2 Failure Points

### 1. Mistral returns invalid JSON
**Symptom**: Parse error in Node 5. Raw output contains markdown fences,
extra text, or truncated JSON.
**Quick fix**: The retry logic in Node 6-7 handles this. If it still fails,
increase max_tokens to 6000 and lower temperature to 0.0.
**Gotcha**: Mistral-7b sometimes truncates output if the tender document
has many criteria. For 20+ criteria, consider splitting the tender text
into sections and running extraction per-section.

### 2. Webhook returns before processing completes
**Symptom**: FastAPI gets the ack but criteria never appear in the DB.
**Quick fix**: Check n8n execution logs (click "Executions" in sidebar).
Look for timeout errors on the OpenAI node — mistral-7b can take 30-60s
on long prompts with only CPU inference.
**n8n gotcha**: If the OpenAI node times out, the default timeout is 60s.
Increase it in node settings → Options → Timeout → 120000.
