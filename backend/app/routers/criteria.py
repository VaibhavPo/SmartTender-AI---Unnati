"""
Criteria Router
===============
CRUD for evaluation criteria. Officer can view, edit, and confirm
the AI-extracted criteria before evaluation begins.

Called by: React (Criteria Review screen), n8n (POST extracted criteria).
"""

import uuid
import logging
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import CriterionSchema, EvaluationTrigger
from app.models.db_models import CriterionDB, TenderDB, AuditEventDB, EvidenceDB, VerdictDB
from app.services.n8n_client import trigger_webhook

logger = logging.getLogger("smarttender.criteria")

router = APIRouter(prefix="/criteria")


# ── POST /criteria/extract — Trigger criteria extraction ──
@router.post("/extract")
async def trigger_criteria_extraction(
    tender_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    POST /api/v1/criteria/extract?tender_id=X&document_id=Y
    Called by: React (officer clicks "Extract Criteria" button).

    Triggers n8n Workflow 2. The workflow will POST back results
    to /webhooks/criteria-extracted.
    """
    # Verify tender exists
    result = await db.execute(select(TenderDB).where(TenderDB.id == tender_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tender not found")

    try:
        await trigger_webhook("criteria-extraction", {
            "tender_id": tender_id,
            "document_id": document_id,
        })
        return {"message": "Criteria extraction triggered", "tender_id": tender_id}
    except Exception as e:
        logger.error(f"Failed to trigger criteria extraction: {e}")
        raise HTTPException(status_code=502, detail="Could not reach n8n workflow")


# ── GET /criteria?tender_id=X — List criteria for a tender ──
@router.get("", response_model=list[CriterionSchema])
async def list_criteria(
    tender_id: str,
    status: str = Query(None, description="Filter by status: 'pending', 'confirmed'"),
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/v1/criteria?tender_id=X&status=confirmed
    Called by: React (Criteria Review, Evaluation Dashboard),
              n8n Workflow 3 (fetches confirmed criteria).
    """
    query = (
        select(CriterionDB)
        .where(CriterionDB.tender_id == tender_id)
        .order_by(CriterionDB.order_index)
    )
    if status:
        query = query.where(CriterionDB.status == status)

    result = await db.execute(query)
    criteria = result.scalars().all()

    return [CriterionSchema.model_validate(c) for c in criteria]



# ── PUT /criteria/{id} — Update a single criterion (officer editing) ──
@router.put("/{criterion_id}", response_model=CriterionSchema)
async def update_criterion(
    criterion_id: str,
    body: CriterionSchema,
    db: AsyncSession = Depends(get_db),
):
    """
    PUT /api/v1/criteria/{id} — Officer edits a criterion.
    Called by: React (Criteria Review screen).

    The AI might extract criteria incorrectly — this lets the officer
    fix them before evaluation starts.
    """
    result = await db.execute(select(CriterionDB).where(CriterionDB.id == criterion_id))
    criterion = result.scalar_one_or_none()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found")

    cast(Any, criterion).name = body.name
    cast(Any, criterion).description = body.description
    cast(Any, criterion).criterion_type = body.criterion_type
    cast(Any, criterion).threshold_value = body.threshold_value
    cast(Any, criterion).unit = body.unit
    cast(Any, criterion).is_mandatory = body.is_mandatory
    cast(Any, criterion).section_reference = body.section_reference
    cast(Any, criterion).order_index = body.order_index

    await db.flush()

    return CriterionSchema.model_validate(criterion)



# ── DELETE /criteria/{id} — Delete a single criterion ──
@router.delete("/{criterion_id}")
async def delete_criterion(
    criterion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    DELETE /api/v1/criteria/{id} — Officer deletes a criterion.
    Called by: React (Criteria Review screen).
    """
    result = await db.execute(select(CriterionDB).where(CriterionDB.id == criterion_id))
    criterion = result.scalar_one_or_none()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found")

    # Check if criterion is confirmed (evaluation started)
    if criterion.status == "confirmed":
        raise HTTPException(status_code=400, detail="Cannot delete confirmed criteria")

    # Delete associated verdicts first (cascade)
    await db.execute(
        delete(VerdictDB).where(VerdictDB.criterion_id == criterion_id)
    )

    # Delete associated evidences
    await db.execute(
        delete(EvidenceDB).where(EvidenceDB.criterion_id == criterion_id)
    )

    # Write audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=criterion.tender_id,
        event_type="CRITERION_DELETED",
        actor="officer",
        entity_type="criterion",
        entity_id=criterion_id,
        detail=f"Deleted criterion: {criterion.name}",
    )
    db.add(audit)

    await db.delete(criterion)
    await db.commit()

    return {"message": "Criterion deleted"}


# ── POST /criteria/confirm — Officer confirms criteria and starts evaluation ──
@router.post("/confirm")
async def confirm_criteria_and_evaluate(
    body: EvaluationTrigger,
    db: AsyncSession = Depends(get_db),
):
    """
    POST /api/v1/criteria/confirm — Officer confirms the criteria list.
    Called by: React (officer clicks "Start Evaluation" button).

    This triggers n8n Workflow 3 (Evidence Extraction) with the
    confirmed criteria and selected bidders.
    """
    # Write audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=body.tender_id,
        event_type="CRITERIA_CONFIRMED",
        actor="officer",
        entity_type="criterion",
        entity_id=body.tender_id,
        detail=f"Confirmed {len(body.criterion_ids)} criteria for {len(body.bidder_ids)} bidders",
    )
    db.add(audit)

    # Mark each confirmed criterion as status='confirmed'
    for cid in body.criterion_ids:
        crit_result = await db.execute(
            select(CriterionDB).where(CriterionDB.id == cid)
        )
        criterion = crit_result.scalar_one_or_none()
        if criterion:
            cast(Any, criterion).status = "confirmed"

    await db.commit()

    # Trigger n8n Workflow 3
    try:
        await trigger_webhook("evidence-extraction", {
            "tender_id": body.tender_id,
            "bidder_ids": body.bidder_ids,
            "criterion_ids": body.criterion_ids,
        })
        return {
            "message": "Evaluation started",
            "tender_id": body.tender_id,
            "bidder_count": len(body.bidder_ids),
            "criterion_count": len(body.criterion_ids),
        }
    except Exception as e:
        logger.error(f"Failed to trigger evidence extraction: {e}")
        raise HTTPException(status_code=502, detail="Could not reach n8n workflow")
