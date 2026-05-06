"""
Tenders Router
==============
CRUD operations for tenders and their bidders.

Called by: React frontend only.

Tenders are the top-level entity. Everything else (documents, criteria,
evidence, verdicts) hangs off a tender_id.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import TenderCreate, TenderResponse, BidderCreate, BidderResponse
from app.models.db_models import TenderDB, BidderDB, DocumentDB, CriterionDB, VerdictDB, EvidenceDB

router = APIRouter(prefix="/tenders")


# ── POST /tenders — Create a new tender ──
@router.post("", response_model=TenderResponse, status_code=201)
async def create_tender(body: TenderCreate, db: AsyncSession = Depends(get_db)):
    """
    POST /api/v1/tenders — Create a new tender evaluation.
    Called by: React (Upload screen).
    """
    tender = TenderDB(
        id=str(uuid.uuid4()),
        name=body.name,
        reference_number=body.reference_number,
        description=body.description,
        submission_deadline=body.submission_deadline,
    )
    db.add(tender)
    await db.flush()

    return TenderResponse(
        id=tender.id,
        name=tender.name,
        reference_number=tender.reference_number,
        description=tender.description,
        submission_deadline=tender.submission_deadline,
        status=tender.status,
        created_at=tender.created_at.isoformat(),
    )


# ── GET /tenders — List all tenders ──
@router.get("", response_model=list[TenderResponse])
async def list_tenders(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/tenders — List all tenders with counts.
    Called by: React (Upload screen, Dashboard).
    """
    result = await db.execute(select(TenderDB).order_by(TenderDB.created_at.desc()))
    tenders = result.scalars().all()

    responses = []
    for t in tenders:
        # Count bidders and documents
        bidder_count = await db.scalar(
            select(func.count(BidderDB.id)).where(BidderDB.tender_id == t.id)
        )
        doc_count = await db.scalar(
            select(func.count(DocumentDB.id)).where(DocumentDB.tender_id == t.id)
        )
        responses.append(TenderResponse(
            id=t.id,
            name=t.name,
            reference_number=t.reference_number,
            description=t.description,
            submission_deadline=t.submission_deadline,
            status=t.status,
            created_at=t.created_at.isoformat(),
            bidder_count=bidder_count or 0,
            document_count=doc_count or 0,
        ))

    return responses


# ── GET /tenders/{id} — Get single tender ──
@router.get("/{tender_id}", response_model=TenderResponse)
async def get_tender(tender_id: str, db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/tenders/{id} — Get tender details.
    Called by: React, n8n (to fetch tender metadata).
    """
    result = await db.execute(select(TenderDB).where(TenderDB.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bidder_count = await db.scalar(
        select(func.count(BidderDB.id)).where(BidderDB.tender_id == tender_id)
    )
    doc_count = await db.scalar(
        select(func.count(DocumentDB.id)).where(DocumentDB.tender_id == tender_id)
    )

    return TenderResponse(
        id=tender.id,
        name=tender.name,
        reference_number=tender.reference_number,
        description=tender.description,
        submission_deadline=tender.submission_deadline,
        status=tender.status,
        created_at=tender.created_at.isoformat(),
        bidder_count=bidder_count or 0,
        document_count=doc_count or 0,
    )


# ── POST /tenders/{id}/bidders — Add a bidder ──
@router.post("/{tender_id}/bidders", response_model=BidderResponse, status_code=201)
async def add_bidder(tender_id: str, body: BidderCreate, db: AsyncSession = Depends(get_db)):
    """
    POST /api/v1/tenders/{id}/bidders — Register a bidder for this tender.
    Called by: React (Upload screen).
    """
    # Verify tender exists
    result = await db.execute(select(TenderDB).where(TenderDB.id == tender_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tender not found")

    bidder = BidderDB(
        id=str(uuid.uuid4()),
        tender_id=tender_id,
        name=body.name,
        registration_number=body.registration_number,
    )
    db.add(bidder)
    await db.flush()

    return BidderResponse(
        id=bidder.id,
        tender_id=bidder.tender_id,
        name=bidder.name,
        registration_number=bidder.registration_number,
        created_at=bidder.created_at.isoformat(),
    )


# ── GET /tenders/{id}/bidders — List bidders ──
@router.get("/{tender_id}/bidders", response_model=list[BidderResponse])
async def list_bidders(tender_id: str, db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/tenders/{id}/bidders — List all bidders for a tender.
    Called by: React, n8n (Workflow 3 needs bidder IDs).
    """
    result = await db.execute(
        select(BidderDB).where(BidderDB.tender_id == tender_id)
    )
    bidders = result.scalars().all()
    return [
        BidderResponse(
            id=b.id,
            tender_id=b.tender_id,
            name=b.name,
            registration_number=b.registration_number,
            created_at=b.created_at.isoformat(),
        )
        for b in bidders
    ]


# ── GET /tenders/{id}/evaluation-data — Get normalized evaluation data ──
@router.get("/{tender_id}/evaluation-data")
async def get_tender_evaluation_data(tender_id: str, db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/tenders/{tender_id}/evaluation-data — Return the tender and all related entities.
    """
    result = await db.execute(select(TenderDB).where(TenderDB.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bidders_result = await db.execute(select(BidderDB).where(BidderDB.tender_id == tender_id))
    bidders = bidders_result.scalars().all()

    criteria_result = await db.execute(select(CriterionDB).where(CriterionDB.tender_id == tender_id))
    criteria = criteria_result.scalars().all()

    # Only get LATEST version of each verdict
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
    verdicts_result = await db.execute(
        select(VerdictDB)
        .join(
            subq,
            (VerdictDB.criterion_id == subq.c.criterion_id)
            & (VerdictDB.bidder_id == subq.c.bidder_id)
            & (VerdictDB.version == subq.c.max_version),
        )
        .where(VerdictDB.tender_id == tender_id)
    )
    verdicts = verdicts_result.scalars().all()

    evidence_result = await db.execute(select(EvidenceDB).where(EvidenceDB.tender_id == tender_id))
    evidence = evidence_result.scalars().all()

    return {
        "tender": {
            "id": tender.id,
            "name": tender.name,
            "reference_number": tender.reference_number,
            "description": tender.description,
            "submission_deadline": tender.submission_deadline,
            "status": tender.status,
            "created_at": tender.created_at.isoformat() if tender.created_at else None,
        },
        "bidders": [
            {
                "id": b.id,
                "tender_id": b.tender_id,
                "name": b.name,
                "registration_number": b.registration_number,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
            for b in bidders
        ],
        "criteria": [
            {
                "id": c.id,
                "tender_id": c.tender_id,
                "name": c.name,
                "description": c.description,
                "criterion_type": c.criterion_type,
                "threshold_value": c.threshold_value,
                "unit": c.unit,
                "is_mandatory": c.is_mandatory,
                "section_reference": c.section_reference,
                "order_index": c.order_index,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in criteria
        ],
        "verdicts": [
            {
                "id": v.id,
                "tender_id": v.tender_id,
                "bidder_id": v.bidder_id,
                "criterion_id": v.criterion_id,
                "evidence_id": v.evidence_id,
                "verdict": v.verdict,
                "reason": v.reason,
                "confidence": v.confidence,
                "decided_by": v.decided_by,
                "version": v.version,
                "decided_at": v.decided_at.isoformat() if v.decided_at else None,
            }
            for v in verdicts
        ],
        "evidence": [
            {
                "id": e.id,
                "tender_id": e.tender_id,
                "bidder_id": e.bidder_id,
                "criterion_id": e.criterion_id,
                "extracted_value": e.extracted_value,
                "source_text": e.source_text,
                "source_pages": e.source_pages,
                "confidence": e.confidence,
                "extraction_method": e.extraction_method,
                "extracted_at": e.extracted_at.isoformat() if e.extracted_at else None,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in evidence
        ],
    }


# ── PATCH /tenders/{tender_id}/bidders/{bidder_id} — Update bidder name ──
@router.patch("/{tender_id}/bidders/{bidder_id}", response_model=BidderResponse)
async def update_bidder(
    tender_id: str,
    bidder_id: str,
    body: BidderCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    PATCH /api/v1/tenders/{tender_id}/bidders/{bidder_id} — Update bidder name.
    Called by: Docling (extract company name from document), React (edit bidder).
    
    This allows the docling service or n8n to extract company names from
    documents and update the bidder record with the actual company name.
    """
    # Verify tender exists
    tender_result = await db.execute(select(TenderDB).where(TenderDB.id == tender_id))
    if not tender_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tender not found")
    
    # Fetch and update bidder
    result = await db.execute(
        select(BidderDB).where(
            (BidderDB.id == bidder_id) & (BidderDB.tender_id == tender_id)
        )
    )
    bidder = result.scalar_one_or_none()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")
    
    # Update fields
    bidder.name = body.name
    if body.registration_number is not None:
        bidder.registration_number = body.registration_number
    
    await db.flush()
    
    return BidderResponse(
        id=bidder.id,
        tender_id=bidder.tender_id,
        name=bidder.name,
        registration_number=bidder.registration_number,
        created_at=bidder.created_at.isoformat(),
    )
