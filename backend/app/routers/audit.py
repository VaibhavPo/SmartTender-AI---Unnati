"""
Audit Events Router
===================
Endpoints for creating and retrieving audit events.

POST /audit-events — n8n workflows and external callers can log audit
events here. Internal code (e.g., webhook handlers) also creates audit
events directly via the ORM, but this endpoint provides a clean HTTP
interface for anything outside Python.

GET /audit-events?tender_id=X — Retrieve audit trail for a tender.
Called by: React (Audit Trail panel), n8n (optional logging).
"""

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import AuditEventDB, TenderDB

logger = logging.getLogger("smarttender.audit")

router = APIRouter(prefix="/audit-events")


# ── Request model for creating an audit event ──
class AuditEventCreate(BaseModel):
    """Request body for POST /audit-events."""
    tender_id: str = Field(..., description="FK to the tender")
    event_type: str = Field(..., description="Event type, e.g. DOCUMENT_UPLOADED")
    actor: str = Field(..., description="Who triggered this event: 'system', 'n8n_workflow_1', 'officer:<name>', etc.")
    entity_type: str = Field(..., description="Affected entity type: 'document', 'criterion', 'evidence', 'verdict', 'report'")
    entity_id: str = Field(..., description="UUID of the affected entity")
    detail: Optional[str] = Field(None, description="Extra context (free-form text or JSON, < 1000 chars)")


# ── POST /audit-events — Create an audit event ──
@router.post("", status_code=201)
async def create_audit_event(body: AuditEventCreate, db: AsyncSession = Depends(get_db)):
    """
    POST /api/v1/audit-events — Log an audit event.
    Called by: n8n workflows, external services, or anything that needs
    to record a significant action in the audit trail.

    The audit_events table is append-only — events are NEVER updated
    or deleted. This is a government procurement requirement.
    """
    # Validate tender exists
    result = await db.execute(select(TenderDB).where(TenderDB.id == body.tender_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tender not found")

    event = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=body.tender_id,
        event_type=body.event_type,
        actor=body.actor,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        detail=body.detail,
    )
    db.add(event)

    logger.info(
        f"Audit event: {body.event_type} by {body.actor} on "
        f"{body.entity_type}/{body.entity_id} (tender {body.tender_id})"
    )
    return {
        "id": event.id,
        "event_type": body.event_type,
        "message": "Audit event recorded",
    }


# ── GET /audit-events — List audit events for a tender ──
@router.get("")
async def list_audit_events(
    tender_id: str = Query(..., description="Tender ID to fetch audit trail for"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(100, ge=1, le=500, description="Max events to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/v1/audit-events?tender_id=X — Retrieve the audit trail.
    Called by: React (Audit Trail panel), report generation.

    Returns events in reverse chronological order (newest first).
    """
    query = (
        select(AuditEventDB)
        .where(AuditEventDB.tender_id == tender_id)
        .order_by(AuditEventDB.timestamp.desc())
        .limit(limit)
    )
    if event_type:
        query = query.where(AuditEventDB.event_type == event_type)

    result = await db.execute(query)
    events = result.scalars().all()

    return [
        {
            "id": e.id,
            "tender_id": e.tender_id,
            "event_type": e.event_type,
            "actor": e.actor,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "detail": e.detail,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        }
        for e in events
    ]
