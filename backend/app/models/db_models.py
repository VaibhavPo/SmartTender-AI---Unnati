"""
SQLAlchemy ORM Models — Database Tables
========================================
These mirror the Pydantic schemas but are the actual database tables.

Design decisions:
- UUIDs as primary keys (generated in Python, not DB) so we can create
  IDs before inserting — useful when n8n needs to reference an entity
  it's about to create.
- Audit tables (verdict_events, audit_events) have NO update/delete
  triggers. In production, add a DB-level policy:
    REVOKE UPDATE, DELETE ON verdict_events FROM app_user;
  For the hackathon, we just never call UPDATE on these tables.
- JSONB columns for semi-structured data (page_blocks) — faster to
  query than a join table, and the data is always read as a whole.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────────────────────────────────────
# Tender — the top-level entity
# ──────────────────────────────────────────────
class TenderDB(Base):
    __tablename__ = "tenders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(500), nullable=False)
    reference_number = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    submission_deadline = Column(String(30), nullable=True)
    status = Column(String(50), default="draft")  # draft, evaluating, completed
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    bidders = relationship("BidderDB", back_populates="tender", cascade="all, delete-orphan")
    documents = relationship("DocumentDB", back_populates="tender", cascade="all, delete-orphan")
    criteria = relationship("CriterionDB", back_populates="tender", cascade="all, delete-orphan")


# ──────────────────────────────────────────────
# Bidder — a company submitting a bid
# ──────────────────────────────────────────────
class BidderDB(Base):
    __tablename__ = "bidders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tender_id = Column(String(36), ForeignKey("tenders.id"), nullable=False)
    name = Column(String(500), nullable=False)
    registration_number = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    tender = relationship("TenderDB", back_populates="bidders")


# ──────────────────────────────────────────────
# Document — maps to StructuredDocumentObject
# page_blocks stored as JSONB for simplicity
# ──────────────────────────────────────────────
class DocumentDB(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tender_id = Column(String(36), ForeignKey("tenders.id"), nullable=False)
    bidder_id = Column(String(36), ForeignKey("bidders.id"), nullable=True)
    filename = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_path = Column(String(1000), nullable=False)  # Path on disk inside the container
    num_pages = Column(Integer, default=0)
    page_blocks = Column(JSONB, default=list)  # List of PageBlock dicts
    avg_confidence = Column(Float, default=0.0)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    ingested_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    tender = relationship("TenderDB", back_populates="documents")

    # Index on tender_id + bidder_id — the most common query pattern
    __table_args__ = (
        Index("ix_documents_tender_bidder", "tender_id", "bidder_id"),
    )


# ──────────────────────────────────────────────
# Criterion — one evaluation rule
# ──────────────────────────────────────────────
class CriterionDB(Base):
    __tablename__ = "criteria"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tender_id = Column(String(36), ForeignKey("tenders.id"), nullable=False)
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    criterion_type = Column(String(50), nullable=False)  # numeric, date, boolean, text
    threshold_value = Column(String(200), nullable=True)
    unit = Column(String(50), nullable=True)
    is_mandatory = Column(Boolean, default=True)
    section_reference = Column(String(200), nullable=True)
    order_index = Column(Integer, default=0)
    status = Column(String(50), default="pending")  # pending, confirmed
    created_at = Column(DateTime(timezone=True), default=utcnow)

    tender = relationship("TenderDB", back_populates="criteria")

    __table_args__ = (
        Index("ix_criteria_tender", "tender_id"),
    )


# ──────────────────────────────────────────────
# Evidence — what the AI found per bidder × criterion
# ──────────────────────────────────────────────
class EvidenceDB(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tender_id = Column(String(36), ForeignKey("tenders.id"), nullable=False)
    bidder_id = Column(String(36), ForeignKey("bidders.id"), nullable=False)
    criterion_id = Column(String(36), ForeignKey("criteria.id"), nullable=False)
    extracted_value = Column(Text, nullable=True)
    source_text = Column(Text, nullable=True)
    source_pages = Column(JSONB, default=list)  # list[int]
    confidence = Column(Float, default=0.0)
    extraction_method = Column(String(50), default="rag")
    extracted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_evidence_tender_bidder_criterion", "tender_id", "bidder_id", "criterion_id"),
        UniqueConstraint("bidder_id", "criterion_id", name="uq_evidence_bidder_criterion"),
    )


# ──────────────────────────────────────────────
# Verdict — append-only! NEVER UPDATE ROWS.
# Each override creates a new row with version+1.
# ──────────────────────────────────────────────
class VerdictDB(Base):
    __tablename__ = "verdict_events"  # Named "events" to remind devs it's append-only

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tender_id = Column(String(36), ForeignKey("tenders.id"), nullable=False)
    bidder_id = Column(String(36), ForeignKey("bidders.id"), nullable=False)
    criterion_id = Column(String(36), ForeignKey("criteria.id"), nullable=False)
    evidence_id = Column(String(36), ForeignKey("evidence.id"), nullable=False)
    verdict = Column(String(50), nullable=False)  # PASS, FAIL, MANUAL_REVIEW, OFFICER_*
    reason = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    decided_by = Column(String(50), default="rule_engine")
    version = Column(Integer, default=1)
    decided_at = Column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_verdicts_tender_bidder", "tender_id", "bidder_id"),
        Index("ix_verdicts_criterion", "criterion_id"),
        UniqueConstraint(
            "tender_id",
            "bidder_id",
            "criterion_id",
            "version",
            name="uq_verdict_tender_bidder_criterion_version",
        ),
    )


# ──────────────────────────────────────────────
# AuditEvent — append-only immutable log
# ──────────────────────────────────────────────
class AuditEventDB(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tender_id = Column(String(36), ForeignKey("tenders.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    actor = Column(String(200), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    detail = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_audit_tender", "tender_id"),
        Index("ix_audit_type", "event_type"),
    )
