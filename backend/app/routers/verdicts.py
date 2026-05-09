"""
Verdicts Router
===============
CRUD for verdict records. Includes officer override endpoint.

Called by: React (Evaluation Dashboard, Manual Review), n8n (POST verdicts).

Key design: verdict_events is an append-only table. When an officer
overrides, we INSERT a new row with version+1, never UPDATE the old one.
"""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import VerdictRecord
from app.models.db_models import VerdictDB, AuditEventDB

logger = logging.getLogger("smarttender.verdicts")

router = APIRouter(prefix="/verdicts")


# ── GET /verdicts?tender_id=X — List latest verdicts ──
@router.get("", response_model=list[VerdictRecord])
async def list_verdicts(
    tender_id: str,
    bidder_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/v1/verdicts?tender_id=X&bidder_id=Y
    Called by: React (Evaluation Dashboard, Report).

    Returns the LATEST version of each verdict (highest version number
    per criterion × bidder pair). Old versions are in the DB for audit
    but not shown in the UI by default.
    """
    # Subquery to get max version per (criterion_id, bidder_id)
    subq = (
        select(
            VerdictDB.criterion_id,
            VerdictDB.bidder_id,
            func.max(VerdictDB.version).label("max_version"),
        )
        .where(VerdictDB.tender_id == tender_id)
        .group_by(VerdictDB.criterion_id, VerdictDB.bidder_id)
        .subquery()
    )

    query = (
        select(VerdictDB)
        .join(
            subq,
            (VerdictDB.criterion_id == subq.c.criterion_id)
            & (VerdictDB.bidder_id == subq.c.bidder_id)
            & (VerdictDB.version == subq.c.max_version),
        )
        .where(VerdictDB.tender_id == tender_id)
    )

    if bidder_id:
        query = query.where(VerdictDB.bidder_id == bidder_id)

    result = await db.execute(query)
    verdicts = result.scalars().all()

    return [
        VerdictRecord(
            id=v.id,
            tender_id=v.tender_id,
            bidder_id=v.bidder_id,
            criterion_id=v.criterion_id,
            evidence_id=v.evidence_id,
            verdict=v.verdict,
            reason=v.reason,
            confidence=v.confidence,
            decided_by=v.decided_by,
            version=v.version,
            decided_at=v.decided_at.isoformat() if v.decided_at else None,
        )
        for v in verdicts
    ]


# ── POST /verdicts/override — Officer overrides a verdict ──
class OverrideRequest(BaseModel):
    verdict_id: str = Field(..., description="ID of the verdict being overridden")
    new_verdict: str = Field(..., description="OFFICER_APPROVED or OFFICER_REJECTED")
    justification: str = Field(
        ..., min_length=10,
        description="Officer must explain why they're overriding. Min 10 chars. Audit requirement."
    )


@router.post("/override", response_model=VerdictRecord, status_code=201)
async def override_verdict(body: OverrideRequest, db: AsyncSession = Depends(get_db)):
    """
    POST /api/v1/verdicts/override — Officer overrides a verdict.
    Called by: React (Manual Review screen).

    Creates a NEW verdict record with version+1. The old record stays
    in the DB forever (append-only audit).
    """
    # Get the existing verdict
    result = await db.execute(select(VerdictDB).where(VerdictDB.id == body.verdict_id))
    old_verdict = result.scalar_one_or_none()
    if not old_verdict:
        raise HTTPException(status_code=404, detail="Verdict not found")

    # Validate new verdict is an officer action
    valid_overrides = ["OFFICER_APPROVED", "OFFICER_REJECTED"]
    if body.new_verdict not in valid_overrides:
        raise HTTPException(
            status_code=400,
            detail=f"Override verdict must be one of: {valid_overrides}",
        )

    # Create new verdict record (append-only — never modify old one)
    new_verdict = VerdictDB(
        id=str(uuid.uuid4()),
        tender_id=old_verdict.tender_id,
        bidder_id=old_verdict.bidder_id,
        criterion_id=old_verdict.criterion_id,
        evidence_id=old_verdict.evidence_id,
        verdict=body.new_verdict,
        reason=body.justification,
        confidence=1.0,  # Officer decision is authoritative
        decided_by="officer_override",
        version=old_verdict.version + 1,
    )
    db.add(new_verdict)

    # Write audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=old_verdict.tender_id,
        event_type="VERDICT_OVERRIDDEN",
        actor="officer",
        entity_type="verdict",
        entity_id=new_verdict.id,
        detail=f"Overrode verdict {old_verdict.id} (v{old_verdict.version}) "
               f"from {old_verdict.verdict} to {body.new_verdict}. "
               f"Justification: {body.justification}",
    )
    db.add(audit)
    await db.flush()

    logger.info(
        f"Verdict overridden: {old_verdict.id} v{old_verdict.version} "
        f"→ {new_verdict.id} v{new_verdict.version} ({body.new_verdict})"
    )

    return VerdictRecord(
        id=new_verdict.id,
        tender_id=new_verdict.tender_id,
        bidder_id=new_verdict.bidder_id,
        criterion_id=new_verdict.criterion_id,
        evidence_id=new_verdict.evidence_id,
        verdict=new_verdict.verdict,
        reason=new_verdict.reason,
        confidence=new_verdict.confidence,
        decided_by=new_verdict.decided_by,
        version=new_verdict.version,
        decided_at=new_verdict.decided_at.isoformat() if new_verdict.decided_at else None,
    )
