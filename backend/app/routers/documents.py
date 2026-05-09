"""
Documents Router
================
File upload and document retrieval. When a file is uploaded, we
store it on disk and trigger n8n Workflow 1 (Document Ingestion)
via webhook.

Called by: React (file upload), n8n (fetch SDO for processing).
"""

import os
import uuid
import base64
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.schemas import StructuredDocumentObject
from app.models.db_models import DocumentDB, TenderDB, BidderDB, AuditEventDB
from app.services.n8n_client import trigger_webhook

logger = logging.getLogger("smarttender.documents")

router = APIRouter(prefix="/documents")


# ── POST /documents/upload — Upload a document ──
@router.post("/upload", response_model=StructuredDocumentObject, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    tender_id: str = Form(...),
    bidder_id: str = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    POST /api/v1/documents/upload — Upload a PDF or image.
    Called by: React (Upload screen).

    Flow:
    1. Validate tender (and bidder if provided) exist.
    2. Save file to disk.
    3. Create a DocumentDB record with status="pending".
    4. Trigger n8n Workflow 1 via webhook.
    5. Return the document record immediately (ingestion is async).
    """
    # Normalize empty bidder_id to None
    # Swagger/Form sends "" for empty optional fields. We also handle "null" or "undefined"
    # which some frontend frameworks might send if not handled carefully.
    if bidder_id:
        bidder_id_clean = bidder_id.strip().lower()
        if not bidder_id_clean or bidder_id_clean in ["null", "undefined", "none", ""]:
            bidder_id = None
        else:
            # Keep original case for the ID if it's a valid string
            bidder_id = bidder_id.strip()

    if bidder_id:
        logger.info(f"Uploading document for bidder: {bidder_id} (Tender: {tender_id})")
    else:
        logger.info(f"Uploading general tender document (Tender: {tender_id})")

    # Validate tender exists
    result = await db.execute(select(TenderDB).where(TenderDB.id == tender_id))
    if not result.scalar_one_or_none():
        logger.warning(f"Upload failed: Tender {tender_id} not found")
        raise HTTPException(status_code=404, detail="Tender not found")

    # Validate bidder if provided
    if bidder_id:
        result = await db.execute(select(BidderDB).where(BidderDB.id == bidder_id))
        if not result.scalar_one_or_none():
            logger.warning(f"Upload failed: Bidder {bidder_id} not found")
            raise HTTPException(status_code=404, detail="Bidder not found")

    # Validate file type
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/tiff"]
    if file.content_type not in allowed_types:
        logger.warning(f"Upload failed: Unsupported file type {file.content_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {allowed_types}",
        )

    # Generate document ID and save file
    doc_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}{file_ext}")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    logger.info(f"Saved file: {file.filename} → {file_path} ({len(content)} bytes)")

    # Create DB record
    doc = DocumentDB(
        id=doc_id,
        tender_id=tender_id,
        bidder_id=bidder_id,
        filename=file.filename or "unknown",
        file_type=file.content_type or "application/pdf",
        file_path=file_path,
        status="pending",
    )
    db.add(doc)

    # Write audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=tender_id,
        event_type="DOCUMENT_UPLOADED",
        actor="system",
        entity_type="document",
        entity_id=doc_id,
        detail=f"Uploaded {file.filename} ({len(content)} bytes) - Bidder: {bidder_id or 'General'}",
    )
    db.add(audit)
    await db.commit()

    # Trigger n8n Workflow 1 — Document Ingestion
    # This is fire-and-forget. n8n will POST results back to /webhooks/ingestion-complete
    try:
        await trigger_webhook("document-ingestion", {
            "document_id": doc_id,
            "tender_id": tender_id,
            "bidder_id": bidder_id,
            "filename": file.filename,
            "file_type": file.content_type,
            "file_path": file_path,
        })
        logger.info(f"Triggered n8n ingestion for document {doc_id}")
    except Exception as e:
        # Don't fail the upload if n8n is down — the document is saved.
        # Officer can re-trigger ingestion manually.
        logger.error(f"Failed to trigger n8n ingestion: {e}")

    return StructuredDocumentObject(
        id=doc_id,
        tender_id=tender_id,
        bidder_id=bidder_id,
        filename=file.filename or "unknown",
        file_type=file.content_type or "application/pdf",
        num_pages=0,
        page_blocks=[],
        avg_confidence=0.0,
        status="pending",
    )


# ── GET /documents/{id} — Get a single document with its SDO ──
@router.get("/{document_id}", response_model=StructuredDocumentObject)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/documents/{id} — Retrieve document with extracted content.
    Called by: n8n (Workflow 2 fetches tender doc SDO), React (document viewer).
    """
    result = await db.execute(select(DocumentDB).where(DocumentDB.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return StructuredDocumentObject(
        id=doc.id,
        tender_id=doc.tender_id,
        bidder_id=doc.bidder_id,
        filename=doc.filename,
        file_type=doc.file_type,
        num_pages=doc.num_pages,
        page_blocks=doc.page_blocks or [],
        avg_confidence=doc.avg_confidence,
        status=doc.status,
        ingested_at=doc.ingested_at.isoformat() if doc.ingested_at else None,
    )


# ── GET /documents?tender_id=X — List documents for a tender ──
@router.get("", response_model=list[StructuredDocumentObject])
async def list_documents(
    tender_id: str,
    bidder_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/v1/documents?tender_id=X&bidder_id=Y — List documents.
    Called by: React, n8n.
    """
    query = select(DocumentDB).where(DocumentDB.tender_id == tender_id)
    if bidder_id:
        query = query.where(DocumentDB.bidder_id == bidder_id)

    result = await db.execute(query)
    docs = result.scalars().all()

    return [
        StructuredDocumentObject(
            id=doc.id,
            tender_id=doc.tender_id,
            bidder_id=doc.bidder_id,
            filename=doc.filename,
            file_type=doc.file_type,
            num_pages=doc.num_pages,
            page_blocks=doc.page_blocks or [],
            avg_confidence=doc.avg_confidence,
            status=doc.status,
            ingested_at=doc.ingested_at.isoformat() if doc.ingested_at else None,
        )
        for doc in docs
    ]


# ── GET /documents/{id}/file — Stream the raw file binary ──
@router.get("/{document_id}/file")
async def get_document_file(document_id: str, db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/documents/{id}/file — Stream the raw uploaded file.
    Called by: n8n Workflow 1 (Node 3a/3b) to fetch the file from FastAPI
    and pipe it to Docling, since n8n can't directly read files from
    another container's volume.

    Returns the binary file with the correct Content-Type header so
    n8n can forward it as multipart form-data to Docling.
    """
    result = await db.execute(select(DocumentDB).where(DocumentDB.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        logger.error(f"File not found on disk: {doc.file_path}")
        raise HTTPException(
            status_code=404,
            detail="File not found on disk. It may have been deleted.",
        )

    return FileResponse(
        path=doc.file_path,
        media_type=doc.file_type,
        filename=doc.filename,
    )


# ── GET /documents/{id}/page/{page_num}/image — Render PDF page as base64 ──
@router.get("/{document_id}/page/{page_num}/image")
async def get_page_image(
    document_id: str, page_num: int, db: AsyncSession = Depends(get_db)
):
    """
    GET /api/v1/documents/{id}/page/{page_num}/image
    Called by: n8n Workflow 1 (Node 5 — LLaVA Vision Fallback).

    When Docling reports low confidence (< 0.7) on a page, n8n calls
    this endpoint to get a rendered image of that page, then sends it
    to LLaVA for OCR.

    Uses PyMuPDF (fitz) to render the page at 200 DPI and returns the
    image as base64-encoded PNG.
    """
    result = await db.execute(select(DocumentDB).where(DocumentDB.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.file_type.startswith("application/pdf"):
        # For image documents, read and return the image directly
        if not os.path.exists(doc.file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        with open(doc.file_path, "rb") as f:
            image_data = f.read()
        return {"base64_image": base64.b64encode(image_data).decode("utf-8")}

    # For PDFs, render the requested page with PyMuPDF
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PyMuPDF (pymupdf) is not installed. Add it to requirements.txt.",
        )

    try:
        pdf = fitz.open(doc.file_path)
    except Exception as e:
        logger.error(f"Failed to open PDF {doc.file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to open PDF: {e}")

    # page_num is 1-indexed from the workflow, fitz uses 0-indexed
    page_index = page_num - 1
    if page_index < 0 or page_index >= len(pdf):
        pdf.close()
        raise HTTPException(
            status_code=404,
            detail=f"Page {page_num} not found. Document has {len(pdf)} pages.",
        )

    page = pdf[page_index]
    # Render at 200 DPI (default is 72 → scale factor ~2.78)
    mat = fitz.Matrix(200 / 72, 200 / 72)
    pix = page.get_pixmap(matrix=mat)
    image_bytes = pix.tobytes("png")
    pdf.close()

    logger.info(f"Rendered page {page_num} of document {document_id} ({len(image_bytes)} bytes)")
    return {"base64_image": base64.b64encode(image_bytes).decode("utf-8")}


# ── DELETE /documents/{id} — Delete a document ──
@router.delete("/{document_id}")
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """
    DELETE /api/v1/documents/{id}
    Called by: React (Upload screen) when user clicks the trash icon.
    """
    result = await db.execute(select(DocumentDB).where(DocumentDB.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
            logger.info(f"Deleted file from disk: {doc.file_path}")
        except Exception as e:
            logger.error(f"Failed to delete file from disk: {e}")

    # Write audit event
    audit = AuditEventDB(
        id=str(uuid.uuid4()),
        tender_id=doc.tender_id,
        event_type="DOCUMENT_DELETED",
        actor="officer",
        entity_type="document",
        entity_id=doc.id,
        detail=f"Deleted document: {doc.filename}",
    )
    db.add(audit)

    await db.delete(doc)
    await db.commit()

    return {"message": "Document deleted successfully"}
