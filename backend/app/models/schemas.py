"""
Pydantic Schemas — Core Data Models
====================================
These are the API-layer data shapes. They define what goes over the wire
between FastAPI ↔ React and FastAPI ↔ n8n.

Design decisions:
- Every model has an `id` field (UUID string) so we never have to deal
  with auto-increment IDs leaking internal DB ordering.
- Timestamps are ISO 8601 strings, not Python datetimes, because JSON
  doesn't have a native datetime type and this avoids timezone bugs.
- Optional fields default to None — n8n can omit fields it doesn't have
  yet (e.g., confidence before the model runs).
- Comments on non-obvious fields explain WHY, not WHAT.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, Union
from pydantic import BaseModel, Field, field_validator


# ╔══════════════════════════════════════════════════════════════════╗
# ║  PageBlock                                                       ║
# ║  One chunk of content extracted from a document page.            ║
# ║  Created by: Docling (or llava vision fallback).                 ║
# ╚══════════════════════════════════════════════════════════════════╝

class PageBlock(BaseModel):
    page_num: int = Field(..., description="1-indexed page number within the document")
    block_index: int = Field(..., description="0-indexed position of this block on the page — preserves reading order")
    block_type: str = Field(
        ...,
        description="Semantic type: 'text', 'table', 'header', 'figure_caption', 'list_item'. "
                    "Docling assigns this. We keep it so evidence extraction can prioritize tables over prose."
    )
    text: str = Field(..., description="The actual extracted text content")
    confidence: float = Field(
        ...,
        ge=0.0, le=1.0,
        description="OCR confidence. Native PDFs get 1.0. Scanned pages typically 0.7-0.95. "
                    "Below 0.7 triggers the llava vision fallback in n8n Workflow 1."
    )
    bbox: Optional[list[float]] = Field(
        None,
        description="Bounding box [x0, y0, x1, y1] in PDF coordinates. "
                    "Useful for highlighting the source location in the UI. "
                    "None for blocks that came from the llava vision fallback."
    )
    source: str = Field(
        default="docling",
        description="Which extractor produced this block: 'docling' or 'llava_vision'. "
                    "Needed for audit trail — regulators want to know which AI touched the data."
    )


# ╔══════════════════════════════════════════════════════════════════╗
# ║  StructuredDocumentObject (SDO)                                  ║
# ║  The canonical representation of one uploaded document after     ║
# ║  ingestion. One tender PDF → one SDO. One bidder PDF → one SDO. ║
# ╚══════════════════════════════════════════════════════════════════╝

class StructuredDocumentObject(BaseModel):
    id: str = Field(..., description="UUID — primary key")
    tender_id: str = Field(..., description="FK to the tender this document belongs to")
    bidder_id: Optional[str] = Field(
        None,
        description="FK to the bidder. None for the tender document itself — "
                    "only bidder submission documents get a bidder_id."
    )
    filename: str = Field(..., description="Original uploaded filename — shown in UI")
    file_type: str = Field(..., description="MIME type: 'application/pdf', 'image/jpeg', etc.")
    num_pages: int = Field(..., description="Total page count — sanity check for the UI")
    page_blocks: list[PageBlock] = Field(
        default_factory=list,
        description="Ordered list of all extracted content blocks across all pages"
    )
    avg_confidence: float = Field(
        default=0.0,
        description="Mean OCR confidence across all blocks. Displayed in the UI as a "
                    "trust indicator. Below 0.7 shows a warning badge."
    )
    ingested_at: Optional[str] = Field(
        None,
        description="ISO 8601 timestamp when ingestion completed. Set by n8n Workflow 1."
    )
    status: str = Field(
        default="pending",
        description="Ingestion status: 'pending' → 'processing' → 'completed' → 'failed'. "
                    "The UI polls this to show a progress indicator."
    )


# ╔══════════════════════════════════════════════════════════════════╗
# ║  CriterionSchema                                                ║
# ║  One evaluation criterion extracted from the tender document.   ║
# ║  Created by: mistral-7b-instruct via n8n Workflow 2.            ║
# ╚══════════════════════════════════════════════════════════════════╝

class CriterionType(str, Enum):
    """
    The type determines which rule-layer check runs in Workflow 4.
    
    NUMERIC: extracted_value >= threshold  (e.g., "minimum turnover ≥ 5 crore")
    DATE:    extracted_date > reference_date  (e.g., "GST registration valid beyond submission")
    BOOLEAN: simple yes/no existence check  (e.g., "ISO 9001 certificate attached")
    TEXT:    free-form — always goes to LLM for verdict  (e.g., "relevant experience description")
    TECHNICAL/FINANCIAL/COMPLIANCE/CERTIFICATION: domain-specific categories for LLM evaluation.
    """
    NUMERIC = "numeric"
    DATE = "date"
    BOOLEAN = "boolean"
    TEXT = "text"
    TECHNICAL = "technical"
    FINANCIAL = "financial"
    COMPLIANCE = "compliance"
    CERTIFICATION = "certification"


class CriterionSchema(BaseModel):
    id: str = Field(..., description="UUID — primary key")
    tender_id: str = Field(..., description="FK to the tender")
    name: str = Field(..., description="Short human-readable criterion name, e.g., 'Minimum Annual Turnover'")
    description: str = Field(
        ...,
        description="Full criterion text as stated in the tender document. "
                    "This gets embedded and used for vector search in Workflow 3."
    )
    criterion_type: CriterionType = Field(
        ...,
        description="Determines which rule-layer check applies in the verdict engine"
    )
    threshold_value: Optional[Union[str, int, float]] = Field(
        None,
        description="The benchmark value from the tender. String, number, or "
                    "date. E.g., 50000000 for 5 crore, '2025-12-31' for a date. "
                    "Workflow 4 parses this based on criterion_type."
    )
    unit: Optional[str] = Field(
        None,
        description="Unit for numeric criteria: 'INR', 'years', 'count', etc. "
                    "Helps the LLM avoid unit confusion (lakhs vs crores is a real bug)."
    )

    @field_validator("threshold_value", mode="before")
    @classmethod
    def coerce_threshold_to_string(cls, v):
        """Coerce int/float to string so asyncpg doesn't complain about VARCHAR column."""
        if v is None:
            return None
        return str(v)
    is_mandatory: bool = Field(
        default=True,
        description="If True, failing this criterion disqualifies the bidder entirely. "
                    "Mandatory criteria get a red badge in the UI."
    )
    section_reference: Optional[str] = Field(
        None,
        description="Where in the tender document this criterion appears, e.g., 'Section 4.2.1, Page 12'. "
                    "Shown in the UI so the officer can verify quickly."
    )
    order_index: int = Field(
        default=0,
        description="Display order — criteria are shown in this order in the UI and report"
    )


# ╔══════════════════════════════════════════════════════════════════╗
# ║  EvidenceObject                                                  ║
# ║  What the AI found in a bidder's document for a given criterion. ║
# ║  Created by: mistral-7b-instruct via n8n Workflow 3.            ║
# ╚══════════════════════════════════════════════════════════════════╝

class EvidenceObject(BaseModel):
    id: str = Field(..., description="UUID — primary key")
    tender_id: str = Field(..., description="FK to the tender")
    bidder_id: str = Field(..., description="FK to the bidder — every evidence is bidder-specific")
    criterion_id: str = Field(..., description="FK to the criterion this evidence addresses")
    extracted_value: Optional[str] = Field(
        None,
        description="The concrete value extracted from the bidder's document. "
                    "Could be '75000000' (turnover), '2026-03-31' (expiry date), or 'yes'. "
                    "None means the AI could not find any relevant information — this is "
                    "important: None ≠ 'no', it means MISSING. Workflow 4 treats None as MANUAL_REVIEW."
    )
    source_text: Optional[str] = Field(
        None,
        description="The verbatim text chunk from the bidder's document that the value "
                    "was extracted from. Shown in the UI for officer verification. "
                    "This is the 'show your work' field — critical for government audits."
    )
    source_pages: list[int] = Field(
        default_factory=list,
        description="Page numbers where the evidence was found. Lets the officer "
                    "jump directly to the relevant page in the original PDF."
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="How confident the AI is in this extraction. Above 0.8 = auto-verdict. "
                    "Below 0.8 = LLM reasoning in Workflow 4. Below 0.5 = MANUAL_REVIEW."
    )
    extraction_method: str = Field(
        default="rag",
        description="How the evidence was obtained: 'rag' (vector search + LLM), "
                    "'direct_match' (exact text match), 'vision' (llava from image). "
                    "Audit trail needs this."
    )
    extracted_at: Optional[str] = Field(
        None,
        description="ISO 8601 timestamp when extraction completed"
    )


# ╔══════════════════════════════════════════════════════════════════╗
# ║  VerdictRecord                                                   ║
# ║  The final pass/fail/review decision for one criterion × bidder. ║
# ║  Created by: n8n Workflow 4 (Verdict Engine).                    ║
# ║  Stored in append-only audit table — NEVER updated, only new    ║
# ║  records with a new version number.                              ║
# ╚══════════════════════════════════════════════════════════════════╝

class VerdictStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    # Officer override statuses — set from the React UI
    OFFICER_APPROVED = "OFFICER_APPROVED"
    OFFICER_REJECTED = "OFFICER_REJECTED"


class VerdictRecord(BaseModel):
    id: str = Field(..., description="UUID — primary key")
    tender_id: str = Field(..., description="FK to the tender")
    bidder_id: str = Field(..., description="FK to the bidder")
    criterion_id: str = Field(..., description="FK to the criterion")
    evidence_id: str = Field(..., description="FK to the evidence this verdict is based on")
    verdict: VerdictStatus = Field(..., description="The decision")
    reason: str = Field(
        ...,
        description="Human-readable explanation of WHY this verdict was reached. "
                    "For rule-based verdicts: '75,00,000 >= 50,00,000 (threshold)'. "
                    "For LLM verdicts: the model's reasoning. "
                    "For officer overrides: the officer's typed justification. "
                    "This field is mandatory — no verdict without a reason. Audit requirement."
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0, le=1.0,
        description="Confidence in the verdict. Rule-based = 1.0. LLM = model's reported confidence. "
                    "Officer override = 1.0 (human decision is authoritative)."
    )
    decided_by: str = Field(
        default="rule_engine",
        description="Who/what made this decision: 'rule_engine', 'llm_reasoning', 'officer_override'. "
                    "Critical for audit — government procurement requires knowing if an AI or human decided."
    )
    version: int = Field(
        default=1,
        description="Monotonically increasing version. When an officer overrides, a new VerdictRecord "
                    "is created with version+1. Old records are NEVER deleted (append-only audit)."
    )
    decided_at: Optional[str] = Field(
        None,
        description="ISO 8601 timestamp when this verdict was recorded"
    )


# ╔══════════════════════════════════════════════════════════════════╗
# ║  AuditEvent                                                      ║
# ║  Immutable log entry. Every significant action gets one.         ║
# ║  This is the table auditors will look at first.                  ║
# ║  NEVER updated, NEVER deleted. Append-only.                      ║
# ╚══════════════════════════════════════════════════════════════════╝

class AuditEventType(str, Enum):
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_INGESTED = "DOCUMENT_INGESTED"
    CRITERIA_EXTRACTED = "CRITERIA_EXTRACTED"
    CRITERIA_CONFIRMED = "CRITERIA_CONFIRMED"
    EVIDENCE_EXTRACTED = "EVIDENCE_EXTRACTED"
    VERDICT_RENDERED = "VERDICT_RENDERED"
    EVALUATION_COMPLETED = "EVALUATION_COMPLETED"
    VERDICT_OVERRIDDEN = "VERDICT_OVERRIDDEN"
    REPORT_GENERATED = "REPORT_GENERATED"


class AuditEvent(BaseModel):
    id: str = Field(..., description="UUID — primary key")
    tender_id: str = Field(..., description="FK to the tender — every audit event is tender-scoped")
    event_type: AuditEventType = Field(..., description="What happened")
    actor: str = Field(
        ...,
        description="Who did it: 'system', 'n8n_workflow_1', 'officer:<name>', etc. "
                    "In a hackathon you can hardcode 'officer'. In production, "
                    "this comes from the JWT claims."
    )
    entity_type: str = Field(
        ...,
        description="What entity was affected: 'document', 'criterion', 'evidence', 'verdict', 'report'"
    )
    entity_id: str = Field(
        ...,
        description="UUID of the affected entity — lets you join back to the actual record"
    )
    detail: Optional[str] = Field(
        None,
        description="Free-form JSON or text with extra context. For overrides, "
                    "this stores the officer's justification. Keep it under 1000 chars."
    )
    timestamp: str = Field(
        ...,
        description="ISO 8601 timestamp. Server-side generated, never trust client time."
    )


# ╔══════════════════════════════════════════════════════════════════╗
# ║  Request/Response Models for API Endpoints                       ║
# ║  These are thin wrappers — keep the core models above clean.     ║
# ╚══════════════════════════════════════════════════════════════════╝

class TenderCreate(BaseModel):
    """Request body for creating a new tender."""
    name: str = Field(..., description="Tender name/title")
    reference_number: Optional[str] = Field(None, description="Official tender reference number")
    description: Optional[str] = Field(None, description="Brief description")
    submission_deadline: Optional[str] = Field(None, description="ISO 8601 deadline date")


class TenderResponse(BaseModel):
    """Response body for a tender."""
    id: str
    name: str
    reference_number: Optional[str] = None
    description: Optional[str] = None
    submission_deadline: Optional[str] = None
    status: str = "draft"
    created_at: str
    bidder_count: int = 0
    document_count: int = 0


class BidderCreate(BaseModel):
    """Request body for adding a bidder to a tender."""
    name: str = Field(..., description="Bidder/company name")
    registration_number: Optional[str] = Field(None, description="Company registration number")


class BidderResponse(BaseModel):
    """Response body for a bidder."""
    id: str
    tender_id: str
    name: str
    registration_number: Optional[str] = None
    created_at: str


class EvaluationTrigger(BaseModel):
    """Request body when officer clicks 'Start Evaluation'."""
    tender_id: str
    bidder_ids: list[str]
    criterion_ids: list[str]


class ReportRequest(BaseModel):
    """Request body for report generation."""
    tender_id: str
    include_audit_trail: bool = True
