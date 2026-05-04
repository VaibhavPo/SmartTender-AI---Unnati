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
from app.models.db_models import TenderDB, BidderDB, DocumentDB

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
