# Workflow 3 — Evidence Extraction

## Trigger
**Webhook** → `POST /webhook/evidence-extraction`

Payload from FastAPI:
```json
{
  "tender_id": "uuid",
  "bidder_ids": ["uuid1", "uuid2"],
  "criterion_ids": ["uuid1", "uuid2", "uuid3"]
}
```

## Node Sequence

### Node 1: Webhook Trigger
- **Type**: Webhook
- **Path**: `evidence-extraction`
- **Response Mode**: Immediate ack

### Node 2: Fetch Criteria Details
- **Type**: HTTP Request
- **Method**: GET
- **URL**: `http://backend:8000/api/v1/criteria?tender_id={{$json.tender_id}}`
- Returns full CriterionSchema array

### Node 3: Build Bidder × Criterion Matrix (Code)
- **Type**: Code (JavaScript)
```javascript
const bidder_ids = $('Node 1').first().json.bidder_ids;
const criteria = $('Node 2').first().json;
const tender_id = $('Node 1').first().json.tender_id;

const pairs = [];
for (const bidder_id of bidder_ids) {
  for (const criterion of criteria) {
    pairs.push({
      tender_id,
      bidder_id,
      criterion_id: criterion.id,
      criterion_name: criterion.name,
      criterion_description: criterion.description,
      criterion_type: criterion.criterion_type,
      threshold_value: criterion.threshold_value,
    });
  }
}

return pairs.map(p => ({ json: p }));
```

### Node 4: Split In Batches
- **Type**: Split In Batches
- **Batch Size**: 1 (process one pair at a time — sequential to avoid
  overloading the LLM)

### Node 5: Embed Criterion Text
- **Type**: OpenAI (Embeddings)
- **Model**: `ai/nomic-embed-text`
- **Input**: `{{$json.criterion_description}}`

### Node 6: Search Qdrant
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `http://qdrant:6333/collections/tender_docs/points/search`
- **Body**:
```json
{
  "vector": [<embedding from Node 5>],
  "filter": {
    "must": [
      { "key": "bidder_id", "match": { "value": "{{$json.bidder_id}}" } }
    ]
  },
  "limit": 5,
  "with_payload": true
}
```

### Node 7: Build Extraction Prompt (Code)
- **Type**: Code (JavaScript)
```javascript
const pair = $('Node 4').first().json;
const results = $input.first().json.result || [];

const chunks = results
  .map((r, i) => `[Chunk ${i+1}, Page ${r.payload.page_num}]\n${r.payload.text}`)
  .join('\n\n---\n\n');

return [{
  json: {
    ...pair,
    context_chunks: chunks,
    chunk_count: results.length
  }
}];
```

### Node 8: Extract Evidence (OpenAI Chat)
- **Type**: OpenAI (Chat Completion)
- **Model**: `ai/mistral-7b-instruct-q4`
- **System Prompt**: Use `prompts/evidence_extraction_system.txt`
- **User Prompt**: Use `prompts/evidence_extraction_user.txt` with
  `criterion_description` and `context_chunks` injected
- **Temperature**: 0.0

### Node 9: Parse Evidence JSON (Code)
- **Type**: Code (JavaScript)
- Same markdown fence stripping as Workflow 2
- Parse into EvidenceObject shape

### Node 10: POST Evidence to FastAPI
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `http://backend:8000/api/v1/webhooks/evidence-extracted`
- **Body**: EvidenceObject JSON

### Node 11: Loop Complete Check (Code)
- **Type**: Code (JavaScript)
- After all pairs processed → trigger Workflow 4

### Node 12: Trigger Verdict Engine
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `http://n8n:5678/webhook/verdict-engine`
- **Body**: `{ "tender_id": "...", "bidder_ids": [...] }`

---

## Top 2 Failure Points

### 1. Qdrant returns empty results
**Symptom**: Evidence extraction says "not found" for everything.
**Cause**: Vectors weren't upserted yet (Workflow 1 didn't complete) OR
the collection has a different name than expected.
**Quick fix**: Check `GET http://qdrant:6333/collections` to verify the
collection exists. If it does, check filter — the bidder_id in Qdrant
payload must exactly match (string comparison, case-sensitive).

### 2. Nested loop overwhelms the LLM
**Symptom**: With 5 bidders × 15 criteria = 75 LLM calls. At 30s each
on CPU, that's 37 minutes.
**Quick fix**: Increase batch size to 3 if you have enough RAM (runs 3
LLM calls concurrently). Or reduce criteria to mandatory-only for the
demo and add the rest later.
**n8n gotcha**: The "Split In Batches" node has a subtle behavior —
it loops back to itself. Make sure the "done" output connects to Node 11,
not back to Node 5.
