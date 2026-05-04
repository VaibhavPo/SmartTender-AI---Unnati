# Workflow 4 — Verdict Engine

## Trigger
**HTTP Request** → `POST /webhook/verdict-engine`

Payload from Workflow 3:
```json
{
  "tender_id": "uuid",
  "bidder_ids": ["uuid1", "uuid2"]
}
```

## Node Sequence

### Node 1: Webhook Trigger
- **Type**: Webhook
- **Path**: `verdict-engine`

### Node 2: Fetch All Evidence
- **Type**: HTTP Request (loop per bidder)
- **URL**: `http://backend:8000/api/v1/evidence?tender_id={{tender_id}}&bidder_id={{bidder_id}}`

### Node 3: Fetch All Criteria
- **Type**: HTTP Request
- **URL**: `http://backend:8000/api/v1/criteria?tender_id={{tender_id}}`

### Node 4: Build Evidence-Criterion Pairs (Code)
- **Type**: Code (JavaScript)
- Match each criterion to its evidence for each bidder

### Node 5: Split In Batches
- **Type**: Split In Batches
- **Batch Size**: 1

### Node 6: Rule Layer — Numeric Check (IF)
- **Type**: IF
- **Condition**: `criterion_type == "numeric"` AND `extracted_value != null`
- True → Compare extracted_value >= threshold_value
- Result: PASS or FAIL with confidence 1.0

### Node 7: Rule Layer — Date Check (IF)
- **Type**: IF
- **Condition**: `criterion_type == "date"` AND `extracted_value != null`
- True → Compare extracted_date > tender_submission_date
- Result: PASS or FAIL with confidence 1.0

### Node 8: Rule Layer — Boolean Check (IF)
- **Type**: IF
- **Condition**: `criterion_type == "boolean"` AND `extracted_value != null`
- True → Check if value is "yes" / "true" / "1" / "present"
- Result: PASS or FAIL with confidence 1.0

### Node 9: Rule Layer — Missing Check (IF)
- **Type**: IF
- **Condition**: `extracted_value == null` OR `extracted_value == ""`
- True → Verdict is `MANUAL_REVIEW` immediately
- Reason: "No evidence found in bidder documents"

### Node 10: Confidence Gate (IF)
- **Type**: IF
- **Condition**: `evidence.confidence >= 0.80` AND rule layer gave a clear answer
- True → Use rule verdict directly (skip LLM)
- False → Go to Node 11 (LLM reasoning)

### Node 11: LLM Verdict Reasoning (OpenAI Chat)
- **Type**: OpenAI (Chat Completion)
- **Model**: `ai/mistral-7b-instruct-q4`
- **System Prompt**: Use `prompts/verdict_reasoning_system.txt`
- **User Prompt**: Use `prompts/verdict_reasoning_user.txt` with criterion,
  threshold, extracted value, and reason for ambiguity
- **Temperature**: 0.0

### Node 12: Parse LLM Verdict (Code)
- **Type**: Code (JavaScript)
- Parse JSON response: `{ verdict, reason, confidence }`
- **Important**: If model returns anything other than PASS/FAIL/MANUAL_REVIEW,
  or if confidence < 0.5, force `MANUAL_REVIEW`

### Node 13: POST Verdict to FastAPI
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `http://backend:8000/api/v1/webhooks/verdict-rendered`
- **Body**: VerdictRecord JSON

---

## Top 2 Failure Points

### 1. Rule layer numeric comparison fails on Indian number formats
**Symptom**: "50,00,000" (50 lakh) doesn't parse as a number.
**Quick fix**: In the Code node before comparison, strip commas and 
handle Indian notation:
```javascript
const cleanNumber = (s) => parseFloat(String(s).replace(/,/g, ''));
```
**Production fix**: Store numbers in canonical form (no commas) during
evidence extraction by adding a normalization instruction to the prompt.

### 2. LLM hedges instead of giving a clear verdict
**Symptom**: Model returns `"verdict": "UNCERTAIN"` or some invented status.
**Quick fix**: In Node 12's Code node, add:
```javascript
const valid = ['PASS', 'FAIL', 'MANUAL_REVIEW'];
if (!valid.includes(parsed.verdict)) {
  parsed.verdict = 'MANUAL_REVIEW';
  parsed.reason = 'AI was uncertain: ' + parsed.reason;
  parsed.confidence = 0.3;
}
```
This is already baked into `prompts/verdict_reasoning_system.txt`.
