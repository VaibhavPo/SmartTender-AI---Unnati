"""
Webhooks Router
===============
Inbound endpoints that n8n calls to POST results back into FastAPI.

These are the "callback URLs" — n8n does the AI work, then tells FastAPI
the results so they get stored in PostgreSQL and are available to the UI.

Called by: n8n ONLY. React never calls these.

Naming convention:
- n8n webhook trigger URL: http://n8n:5678/webhook/<workflow-name>
- n8n callback into FastAPI: POST /api/v1/webhooks/<stage>-complete
"""

import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import (
    StructuredDocumentObject,
    CriterionSchema,
    EvidenceObject,
    VerdictRecord,
)
from app.models.db_models import (
    DocumentDB,
    TenderDB,
    CriterionDB,
    EvidenceDB,
    VerdictDB,
    AuditEventDB,
)

logger = logging.getLogger("smarttender.webhooks")

router = APIRouter(prefix="/webhooks")


# ── POST /webhooks/ingestion-complete — n8n Workflow 1 callback ──
@router.post("/ingestion-complete")
async def ingestion_complete(body: StructuredDocumentObject, db: AsyncSession = Depends(get_db)):
    """
    Called by: n8n Workflow 1 after document ingestion + vectorization.

    Updates the document record with extracted page blocks, confidence,
    and marks status as "completed".
    """
    result = await db.execute(select(DocumentDB).where(DocumentDB.id == body.id))
    doc = result.scalar_one_or_none()
    if not doc:
        logger.error(f"Document {body.id} not found for ingestion callback")
        return {"error": "Document not found"}

    doc.num_pages = body.num_pages
    doc.page_blocks = [block.model_dump() for block in body.page_blocks]
    doc.avg_confidence = body.avg_confidence
    doc.status = "completed"
    doc.ingested_at = datetime.now(timezone.utc)

    # Audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=doc.tender_id,
        event_type="DOCUMENT_INGESTED",
        actor="n8n_workflow_1",
        entity_type="document",
        entity_id=doc.id,
        detail=f"Extracted {len(body.page_blocks)} blocks, avg confidence {body.avg_confidence:.2f}",
    )
    db.add(audit)

    logger.info(f"Ingestion complete for document {doc.id}: {len(body.page_blocks)} blocks")
    return {"message": "Ingestion recorded", "document_id": doc.id}


# ── POST /webhooks/criteria-extracted — n8n Workflow 2 callback ──
class CriteriaResult(BaseModel):
    tender_id: str
    criteria: list[CriterionSchema]


@router.post("/criteria-extracted")
async def criteria_extracted(body: CriteriaResult, db: AsyncSession = Depends(get_db)):
    """
    Called by: n8n Workflow 2 after criteria extraction from tender document.

    Stores all extracted criteria in the database. These are then shown
    to the officer for review and editing before evaluation starts.
    """
    # Remove any previously extracted pending criteria for this tender.
    # If WF-2 runs again, we should replace the old pending set rather than duplicate it.
    await db.execute(
        delete(CriterionDB).where(
            CriterionDB.tender_id == body.tender_id,
            CriterionDB.status == "pending",
        )
    )

    stored_ids = []
    seen_criteria: set[tuple[str, str, str, str, str, bool, str, int]] = set()

    def criterion_key(c: CriterionSchema) -> tuple[str, str, str, str, str, bool, str, int]:
        return (
            c.name.strip().casefold(),
            c.description.strip().casefold(),
            c.criterion_type,
            (c.threshold_value or "").strip().casefold(),
            (c.unit or "").strip().casefold(),
            c.is_mandatory,
            (c.section_reference or "").strip().casefold(),
            c.order_index,
        )

    for c in body.criteria:
        key = criterion_key(c)
        if key in seen_criteria:
            continue
        seen_criteria.add(key)

        criterion = CriterionDB(
            id=c.id or str(uuid.uuid4()),
            tender_id=body.tender_id,
            name=c.name,
            description=c.description,
            criterion_type=c.criterion_type,
            threshold_value=c.threshold_value,
            unit=c.unit,
            is_mandatory=c.is_mandatory,
            section_reference=c.section_reference,
            order_index=c.order_index,
        )
        db.add(criterion)
        stored_ids.append(criterion.id)

    # Audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=body.tender_id,
        event_type="CRITERIA_EXTRACTED",
        actor="n8n_workflow_2",
        entity_type="criterion",
        entity_id=body.tender_id,
        detail=f"Extracted {len(body.criteria)} criteria",
    )
    db.add(audit)

    logger.info(f"Stored {len(body.criteria)} criteria for tender {body.tender_id}")
    return {"message": "Criteria stored", "count": len(stored_ids), "ids": stored_ids}


# ── POST /webhooks/criteria-extraction-failed — n8n Workflow 2 failure callback ──
class CriteriaExtractionFailed(BaseModel):
    tender_id: str
    reason: str = "LLM failed to produce valid JSON after retry"
    raw_output: str | None = None  # The last raw LLM output for debugging


@router.post("/criteria-extraction-failed")
async def criteria_extraction_failed(
    body: CriteriaExtractionFailed, db: AsyncSession = Depends(get_db)
):
    """
    Called by: n8n Workflow 2 when BOTH LLM attempts (Node 4 + Node 7)
    fail to produce valid criteria JSON.

    This signals the React UI to show the manual criteria entry form
    instead of waiting for AI extraction. The officer can then type
    criteria by hand.

    Updates tender status to 'criteria_failed' so the UI can detect this.
    """
    # Update tender status so the UI knows extraction failed
    result = await db.execute(select(TenderDB).where(TenderDB.id == body.tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        logger.error(f"Tender {body.tender_id} not found for criteria-extraction-failed callback")
        return {"error": "Tender not found"}

    tender.status = "criteria_failed"

    # Audit event — record the failure with raw output for debugging
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=body.tender_id,
        event_type="CRITERIA_EXTRACTION_FAILED",
        actor="n8n_workflow_2",
        entity_type="tender",
        entity_id=body.tender_id,
        detail=f"Reason: {body.reason}. Raw output: {(body.raw_output or '')[:500]}",
    )
    db.add(audit)

    logger.warning(
        f"Criteria extraction FAILED for tender {body.tender_id}: {body.reason}"
    )
    return {
        "message": "Failure recorded — UI will prompt manual entry",
        "tender_id": body.tender_id,
        "status": "criteria_failed",
    }


# ── POST /webhooks/evidence-extracted — n8n Workflow 3 callback ──
@router.post("/evidence-extracted")
async def evidence_extracted(body: EvidenceObject, db: AsyncSession = Depends(get_db)):
    """
    Called by: n8n Workflow 3 for EACH bidder × criterion pair.

    n8n sends these one at a time as it processes each pair.
    """
    evidence_id = str(uuid.uuid4())
    insert_stmt = insert(EvidenceDB).values(
        id=evidence_id,
        tender_id=body.tender_id,
        bidder_id=body.bidder_id,
        criterion_id=body.criterion_id,
        extracted_value=body.extracted_value,
        source_text=body.source_text,
        source_pages=body.source_pages,
        confidence=body.confidence,
        extraction_method=body.extraction_method,
        extracted_at=datetime.now(timezone.utc),
    )
    stmt = insert_stmt.on_conflict_do_update(
        index_elements=[EvidenceDB.bidder_id, EvidenceDB.criterion_id],
        set_={
            "extracted_value": insert_stmt.excluded.extracted_value,
            "source_text": insert_stmt.excluded.source_text,
            "source_pages": insert_stmt.excluded.source_pages,
            "confidence": insert_stmt.excluded.confidence,
            "extraction_method": insert_stmt.excluded.extraction_method,
            "extracted_at": insert_stmt.excluded.extracted_at,
        },
    )
    await db.execute(stmt)

    # Audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=body.tender_id,
        event_type="EVIDENCE_EXTRACTED",
        actor="n8n_workflow_3",
        entity_type="evidence",
        entity_id=evidence_id,
        detail=f"Extracted evidence for bidder {body.bidder_id}, criterion {body.criterion_id}",
    )
    db.add(audit)

    logger.info(
        f"Evidence stored: bidder={body.bidder_id}, criterion={body.criterion_id}, "
        f"confidence={body.confidence}"
    )
    return {"message": "Evidence stored", "evidence_id": evidence_id}


# ── POST /webhooks/verdict-rendered — n8n Workflow 4 callback ──
@router.post("/verdict-rendered")
async def verdict_rendered(body: VerdictRecord, db: AsyncSession = Depends(get_db)):
    """
    Called by: n8n Workflow 4 for each verdict decision.
    """
    # Prevent duplicate verdict rows when the workflow is run more than once.
    duplicate_check = await db.execute(
        select(VerdictDB.id)
        .where(
            VerdictDB.tender_id == body.tender_id,
            VerdictDB.bidder_id == body.bidder_id,
            VerdictDB.criterion_id == body.criterion_id,
            VerdictDB.version == body.version,
        )
        .limit(1)
    )
    existing_id = duplicate_check.scalar_one_or_none()
    if existing_id:
        logger.info(
            "Duplicate verdict ignored for bidder=%s, criterion=%s, version=%s",
            body.bidder_id,
            body.criterion_id,
            body.version,
        )
        return {"message": "Duplicate verdict ignored", "verdict_id": existing_id}

    verdict = VerdictDB(
        id=body.id or str(uuid.uuid4()),
        tender_id=body.tender_id,
        bidder_id=body.bidder_id,
        criterion_id=body.criterion_id,
        evidence_id=body.evidence_id,
        verdict=body.verdict,
        reason=body.reason,
        confidence=body.confidence,
        decided_by=body.decided_by,
        version=body.version,
    )
    db.add(verdict)

    # Audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=body.tender_id,
        event_type="VERDICT_RENDERED",
        actor=f"n8n_workflow_4_{body.decided_by}",
        entity_type="verdict",
        entity_id=verdict.id,
        detail=f"Verdict {body.verdict} for bidder {body.bidder_id}, "
               f"criterion {body.criterion_id} (confidence: {body.confidence})",
    )
    db.add(audit)

    logger.info(
        f"Verdict stored: {body.verdict} for bidder={body.bidder_id}, "
        f"criterion={body.criterion_id}, decided_by={body.decided_by}"
    )
    return {"message": "Verdict stored", "verdict_id": verdict.id}


# ── POST /webhooks/evaluation-complete — n8n Workflow 4 final callback ─

class EvaluationComplete(BaseModel):
    tender_id: str
    total_verdicts: int = 0
    summary: dict | None = None  # Optional summary stats from n8n (pass/fail counts, etc.)


@router.post("/evaluation-complete")
async def evaluation_complete(
    body: EvaluationComplete, db: AsyncSession = Depends(get_db)
):
    """
    Called by: n8n Workflow 4 AFTER all verdict-rendered calls are done.

    Signals that every bidder × criterion pair has been evaluated.
    This endpoint:
      1. Updates the tender status to 'evaluated'
      2. Logs a final audit event
      3. Triggers n8n Workflow 5 (Report Generation) so the officer
         doesn't have to click another button

    The React UI polls tender status — when it sees 'evaluated',
    it unlocks the Report tab and stops showing the evaluation spinner.
    """
    # Update tender status
    result = await db.execute(select(TenderDB).where(TenderDB.id == body.tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        logger.error(f"Tender {body.tender_id} not found for evaluation-complete callback")
        return {"error": "Tender not found"}

    tender.status = "evaluated"

    # Audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=body.tender_id,
        event_type="EVALUATION_COMPLETED",
        actor="n8n_workflow_4",
        entity_type="tender",
        entity_id=body.tender_id,
        detail=f"All verdicts rendered. Total: {body.total_verdicts}",
    )
    db.add(audit)

    logger.info(
        f"Evaluation complete for tender {body.tender_id}: "
        f"{body.total_verdicts} verdicts rendered"
    )

    # Auto-trigger report generation (Workflow 5)
    try:
        from app.services.n8n_client import trigger_webhook
        await trigger_webhook("report-generation", {
            "tender_id": body.tender_id,
        })
        logger.info(f"Report generation triggered for tender {body.tender_id}")
    except Exception as e:
        # Non-fatal — the officer can still trigger report manually
        logger.warning(
            f"Could not auto-trigger report generation for {body.tender_id}: {e}"
        )

    return {
        "message": "Evaluation complete — tender status updated to 'evaluated'",
        "tender_id": body.tender_id,
        "status": "evaluated",
    }


# ── POST /webhooks/report-ready — n8n Workflow 5 callback ──
class ReportReady(BaseModel):
    tender_id: str
    html_content: str


@router.post("/report-ready")
async def report_ready(body: ReportReady, db: AsyncSession = Depends(get_db)):
    """
    Called by: n8n Workflow 5 after building the report.

    Receives the HTML report content, renders it to PDF via WeasyPrint,
    and stores the file.
    """
    from app.routers.reports import render_pdf
    return await render_pdf(body.tender_id, body.html_content, db)
