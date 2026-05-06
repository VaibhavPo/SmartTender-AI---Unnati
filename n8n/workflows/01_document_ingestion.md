# Workflow 1 — Document Ingestion

## Trigger
**Webhook** → `POST /webhook/document-ingestion`

Payload from FastAPI:
```json
{
  "document_id": "uuid",
  "tender_id": "uuid",
  "bidder_id": "uuid or null",
  "filename": "tender_abc.pdf",
  "file_type": "application/pdf",
  "file_path": "/app/uploads/uuid.pdf"
}
```

## Node Sequence

### Node 1: Webhook Trigger
- **Type**: Webhook
- **Method**: POST
- **Path**: `document-ingestion`
- **Response Mode**: "Respond to Webhook" → immediately returns `{"received": true}`
  so FastAPI doesn't time out.

### Node 2: Detect Format (IF)
- **Type**: IF
- **Condition**: `{{$json.file_type}}` contains `image` OR filename ends with `.jpg`, `.png`, `.tiff`
- True → Node 3b (Image path)
- False → Node 3a (PDF path)

### Node 3a: Send to Docling (PDF)
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `http://docling:8001/extract`
- **Query Parameters** (optional):
  - `tender_id={{$json.tender_id}}` — Required to update bidder name
  - `bidder_id={{$json.bidder_id}}` — When provided with tender_id, will auto-update bidder name with extracted company name
- **Body Type**: Form-Data / Multipart
- **Send Binary Data**: Download the file from backend first, then send as multipart
  
> **Tricky part**: n8n can't directly read files from another container's volume.
> You need to first fetch the file from FastAPI via:
> `GET http://backend:8000/api/v1/documents/{{$json.document_id}}/file`
> Or use an HTTP Request node to read the file at the path.
> Simplest hack: add a `/documents/{id}/file` endpoint to FastAPI that streams
> the raw file, then pipe it to Docling.

### Node 3b: Send to Docling (Image)
- Same as 3a — Docling handles both images and PDFs
- When `bidder_id` is provided, Docling will extract company name and update the bidder record automatically

### Node 4: Check Confidence (IF)
- **Type**: IF
- **Condition**: Any page_block has `confidence < 0.7`
- True → Node 5 (Vision fallback)
- False → Node 6 (Skip vision)

### Node 5: LLaVA Vision Fallback
- **Type**: OpenAI (Chat Completion)
- **Credentials**: Docker Model Runner (created in setup)
- **Model**: `ai/llava-7b`
- **Messages**: Use the vision OCR prompt from `prompts/vision_ocr_fallback.txt`
- **Input**: Base64-encoded image of the low-confidence page
- Parse the text output and merge into page_blocks

### Node 6: Generate Embeddings (Loop)
- **Type**: Split In Batches (batch size 5)
- For each page_block:
  - **Type**: OpenAI (Embeddings)
  - **Model**: `ai/nomic-embed-text`
  - **Input**: block text
  - Returns 768-dim vector

### Node 7: Upsert to Qdrant
- **Type**: HTTP Request
- **Method**: PUT
- **URL**: `http://qdrant:6333/collections/tender_docs/points`
- **Body**:
  ```json
  {
    "points": [
      {
        "id": "uuid-for-point",
        "vector": [0.123, ...],
        "payload": {
          "document_id": "...",
          "bidder_id": "...",
          "tender_id": "...",
          "page_num": 1,
          "block_type": "text",
          "text": "..."
        }
      }
    ]
  }
  ```

### Node 8: POST SDO to FastAPI
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `http://backend:8000/api/v1/webhooks/ingestion-complete`
- **Body**: Complete StructuredDocumentObject JSON

---

## Top 2 Failure Points

### 1. Docling times out on large PDFs
**Symptom**: HTTP Request node returns 504 or connection timeout.
**Quick fix**: Increase the HTTP Request node timeout to 120s. In the
node settings → Options → Timeout → 120000ms.
**Fallback**: If PDF is >50 pages, split it into chunks of 10 pages
before sending to Docling (add a Code node before Docling).

### 2. Qdrant collection doesn't exist
**Symptom**: Qdrant returns 404 on the upsert.
**Quick fix**: Add a "Create Collection" HTTP Request node before the
first upsert that runs `PUT /collections/tender_docs` with:
```json
{
  "vectors": { "size": 768, "distance": "Cosine" }
}
```
Set it to continue on error (in case collection already exists).
