# n8n Cloud Setup Guide — SmartTender AI

## Overview

n8n Cloud replaces the self-hosted n8n service. It's:
- ✅ Managed and scalable
- ✅ Automatic backups
- ✅ No server maintenance
- ✅ Visual workflow editor
- ❌ Requires internet connection
- ❌ Slightly higher latency than localhost

---

## Step 1: Create n8n Cloud Account

1. Visit https://n8n.io/cloud
2. Sign up with email
3. Verify email
4. Create workspace: `SmartTender` (or your preference)
5. Note your URL: `https://your-username.n8n.cloud`

---

## Step 2: Create OpenAI API Credential

This credential connects n8n Cloud to your Docker Model Runner on EC2.

### 2.1 In n8n Cloud Dashboard

1. Settings (gear icon) → Credentials → Add Credential
2. Select: **OpenAI** (or ChatOpenAI)
3. Fill in:
   - **Display Name**: `Docker Model Runner`
   - **API Key**: `dummy-key-not-validated` (Docker Model Runner doesn't validate)
   - **Base URL**: `http://<YOUR_EC2_PUBLIC_IP>:11434/v1`
   - **Models**: `ai/mistral-7b-instruct-q4` (or whatever you pulled)
4. Save

⚠️ **Note**: Replace `<YOUR_EC2_PUBLIC_IP>` with your actual EC2 public IP address!

---

## Step 3: Set Up Callback Credentials (Optional)

For n8n Cloud to POST results back to your FastAPI backend, you might need auth tokens.

### 3.1 Create Bearer Token (if using authentication)

In your FastAPI backend, you could add an `X-API-Key` header:

```python
# backend/app/config.py
INTERNAL_API_KEY: str = "your-secret-key-here"

# backend/app/main.py — add middleware to check header
```

Then in n8n Cloud, when posting back to FastAPI:
- Add header: `X-API-Key: your-secret-key-here`

---

## Step 4: Build the 5 Workflows

Each workflow has a webhook trigger and posts results back to FastAPI.

### Workflow 1: Document Ingestion

**Trigger:**
- Webhook (HTTP POST)
- **URL**: https://your-username.n8n.cloud/webhook/document-ingestion
- **Method**: POST
- **Response**: Immediate ack (don't wait for entire process)

**Nodes:**

1. **Webhook Trigger** (n8n native)
   - Listens for: `POST /webhook/document-ingestion`
   - Expected payload:
     ```json
     {
       "document_id": "uuid",
       "tender_id": "uuid",
       "bidder_id": "uuid or null",
       "file_path": "s3://bucket/path.pdf",
       "file_type": "application/pdf"
     }
     ```

2. **Download File** (HTTP Request)
   - URL: `{{ $json.file_path }}`
   - Method: GET
   - Return: Binary file

3. **Extract Text with Docling** (HTTP Request)
   - URL: `http://<EC2_IP>:8001/extract`
   - Method: POST
   - Body: Send the PDF binary from Node 2
   - Returns: `{ page_blocks: [...], avg_confidence: 0.85 }`

4. **Extract Embeddings** (Chat OpenAI)
   - Use: `Docker Model Runner` credential
   - Model: `ai/nomic-embed-text`
   - Create embeddings for each page block

5. **Upsert to Qdrant** (HTTP Request)
   - URL: `http://<EC2_IP>:6333/collections/tender_docs/points`
   - Method: PUT
   - Body: 
     ```json
     {
       "points": [
         {
           "id": "uuid",
           "vector": {{ $json.embedding }},
           "payload": {
             "document_id": "{{ $json.document_id }}",
             "page_num": 1,
             "text": "..."
           }
         }
       ]
     }
     ```

6. **POST Callback to FastAPI** (HTTP Request)
   - URL: `http://<EC2_IP>:8000/api/v1/webhooks/ingestion-complete`
   - Method: POST
   - Body:
     ```json
     {
       "id": "{{ $json.document_id }}",
       "tender_id": "{{ $json.tender_id }}",
       "num_pages": 42,
       "page_blocks": {{ $json.page_blocks }},
       "avg_confidence": 0.85
     }
     ```

---

### Workflow 2: Criteria Extraction

**Trigger:**
- Webhook: `/webhook/criteria-extraction`
- Payload: `{ tender_id, document_id }`

**Nodes:**

1. **Webhook** → Receive tender_id, document_id
2. **Fetch Document from FastAPI** (HTTP)
   - GET `http://<EC2_IP>:8000/api/v1/documents/{{ $json.document_id }}`
   - Returns: `{ page_blocks: [...] }`
3. **Concatenate text** (Code node)
   ```javascript
   const blocks = $input.first().json.page_blocks || [];
   return [{ json: { 
     tender_text: blocks.map(b => b.text).join('\n\n'),
     tender_id: $json.tender_id
   }}];
   ```
4. **Call Mistral** (Chat OpenAI with Docker credential)
   - System prompt: "You are a tender analyst. Extract mandatory technical criteria."
   - Prompt: `{{ $json.tender_text }}`
   - Model: `ai/mistral-7b-instruct-q4`
5. **Parse JSON from LLM** (Code node)
   ```javascript
   const response = $input.first().json.message.content;
   const criteria = JSON.parse(response);
   return [{ json: { tender_id: $json.tender_id, criteria } }];
   ```
6. **POST to FastAPI callback**
   - URL: `http://<EC2_IP>:8000/api/v1/webhooks/criteria-extracted`
   - Body: `{ tender_id, criteria: [...] }`

---

### Workflow 3: Evidence Extraction

**Trigger:**
- Webhook: `/webhook/evidence-extraction`
- Payload: `{ tender_id, bidder_ids: [], criterion_ids: [] }`

**Nodes:**

1. **Webhook** → Receive IDs
2. **Loop over bidders** (For Each)
3. **Fetch bidder document** (HTTP)
4. **For each criterion, search Qdrant** (HTTP)
   ```bash
   POST http://<EC2_IP>:6333/collections/tender_docs/points/search
   Body: { "vector": [embedding], "limit": 3 }
   ```
5. **Rank results** (Mistral)
   - Prompt: "Does this evidence satisfy the criterion?"
6. **POST evidence objects** to FastAPI callback
   - URL: `http://<EC2_IP>:8000/api/v1/webhooks/evidence-extracted`

---

### Workflow 4: Verdict Engine

**Similar pattern:**
- Receives: `tender_id, bidder_ids, criterion_ids`
- For each (bidder, criterion) pair:
  - Fetch evidence
  - Call Mistral: "PASS / FAIL / REVIEW - explain"
  - POST to `http://<EC2_IP>:8000/api/v1/webhooks/verdict-rendered`

---

### Workflow 5: Report Generation

**Trigger:**
- Webhook: `/webhook/report-generation`
- Payload: `{ tender_id, include_audit_trail: true }`

**Nodes:**

1. **Fetch all verdicts** from FastAPI
2. **Build HTML report** (Template node)
3. **Render HTML → PDF** (via FastAPI or local tool)
4. **Upload PDF** to S3 / local storage
5. **POST callback** with PDF download URL

---

## Step 5: Test Webhook Connectivity

### From EC2 to n8n Cloud

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  https://your-username.n8n.cloud/webhook/document-ingestion
```

Response should be `202 Accepted` or similar.

### From n8n Cloud to EC2 (FastAPI)

```bash
# In n8n workflow node, test:
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"document_id":"test","status":"complete"}' \
  http://<EC2_IP>:8000/api/v1/webhooks/ingestion-complete
```

---

## Step 6: Configure Callbacks in Backend

In `backend/app/config.py`, set:

```python
N8N_WEBHOOK_BASE_URL = "https://your-username.n8n.cloud/webhook"
```

In `docker-compose.yml`, pass via environment:

```yaml
backend:
  environment:
    N8N_WEBHOOK_BASE_URL: ${N8N_WEBHOOK_BASE_URL:-https://your-username.n8n.cloud/webhook}
```

Then deploy to EC2 with `.env`:

```bash
N8N_WEBHOOK_BASE_URL=https://your-username.n8n.cloud/webhook
```

---

## Step 7: Monitoring & Debugging

### View Execution Logs

1. In n8n Cloud dashboard: Executions (left sidebar)
2. Click on a workflow run
3. See detailed logs for each node

### Common Issues

**Issue**: `Network timeout connecting to EC2`
- **Fix**: Ensure security group allows outbound HTTPS + HTTP
- **Check**: EC2 security group → Outbound rules → Allow all

**Issue**: `Docker Model Runner returns 403`
- **Fix**: Check EC2 IP, port, and firewall
- **Verify**: `curl http://<EC2_IP>:11434/api/tags` from local machine

**Issue**: `FastAPI webhook returns 404`
- **Fix**: Ensure backend is running and healthy
- **Check**: `curl http://<EC2_IP>:8000/api/v1/health`

**Issue**: `Qdrant collection not found`
- **Fix**: Create collection first
- **Via**: `curl -X POST http://<EC2_IP>:6333/collections/tender_docs`

---

## Cost Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| n8n Cloud (Startup plan) | $20/month | 1,000 workflows/month |
| n8n Cloud (Professional) | $50/month | 10,000 workflows/month |
| Additional workflows | +$10 per 1,000 | As needed |

---

## Switching Back to Self-Hosted (Optional)

If you want to self-host n8n later:

1. Edit `docker-compose.yml` to uncomment n8n service
2. Set `N8N_WEBHOOK_BASE_URL=http://n8n:5678/webhook`
3. Export workflows from n8n Cloud → Settings → Export
4. Upload to self-hosted n8n via UI or import via CLI
5. Redeploy `docker compose up -d`

---

**Need Help?**

- n8n Docs: https://docs.n8n.io
- n8n Community: https://community.n8n.io
- SmartTender Support: [Your support email]
