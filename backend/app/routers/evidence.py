"""
Evidence Router
===============
CRUD for evidence objects extracted by n8n Workflow 3.

Called by: React (Evaluation Dashboard, Manual Review), n8n (POST results).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import EvidenceObject
from app.models.db_models import EvidenceDB

logger = logging.getLogger("smarttender.evidence")

router = APIRouter(prefix="/evidence")


# ── GET /evidence?tender_id=X&bidder_id=Y — List evidence ──
@router.get("", response_model=list[EvidenceObject])
async def list_evidence(
    tender_id: str,
    bidder_id: str = None,
    criterion_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/v1/evidence?tender_id=X&bidder_id=Y&criterion_id=Z
    Called by: React (Evaluation Dashboard), n8n (Workflow 4 fetches all evidence).

    Supports filtering by bidder and/or criterion — the dashboard
    shows evidence per-bidder, per-criterion.
    """
    query = select(EvidenceDB).where(EvidenceDB.tender_id == tender_id)
    if bidder_id:
        query = query.where(EvidenceDB.bidder_id == bidder_id)
    if criterion_id:
        query = query.where(EvidenceDB.criterion_id == criterion_id)

    result = await db.execute(query)
    evidence_list = result.scalars().all()

    return [
        EvidenceObject(
            id=e.id,
            tender_id=e.tender_id,
            bidder_id=e.bidder_id,
            criterion_id=e.criterion_id,
            extracted_value=e.extracted_value,
            source_text=e.source_text,
            source_pages=e.source_pages or [],
            confidence=e.confidence,
            extraction_method=e.extraction_method,
            extracted_at=e.extracted_at.isoformat() if e.extracted_at else None,
        )
        for e in evidence_list
    ]


# ── GET /evidence/{id} — Get single evidence ──
@router.get("/{evidence_id}", response_model=EvidenceObject)
async def get_evidence(evidence_id: str, db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/evidence/{id}
    Called by: React (Manual Review detail view), n8n.
    """
    result = await db.execute(select(EvidenceDB).where(EvidenceDB.id == evidence_id))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Evidence not found")

    return EvidenceObject(
        id=e.id,
        tender_id=e.tender_id,
        bidder_id=e.bidder_id,
        criterion_id=e.criterion_id,
        extracted_value=e.extracted_value,
        source_text=e.source_text,
        source_pages=e.source_pages or [],
        confidence=e.confidence,
        extraction_method=e.extraction_method,
        extracted_at=e.extracted_at.isoformat() if e.extracted_at else None,
    )
