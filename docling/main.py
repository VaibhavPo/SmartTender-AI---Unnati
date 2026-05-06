"""
Docling OCR Microservice
========================
Thin FastAPI wrapper around the `docling` library.

Accepts a PDF or image file via multipart upload, runs OCR / layout
analysis, and returns structured page blocks with confidence scores.

This service does ONE thing: turn documents into structured text.
n8n calls this via HTTP node. FastAPI never calls this directly.

Why its own microservice instead of embedding in the backend:
- Docling loads heavy ML models on startup (~1-2 GB RAM). Isolating it
  means the backend stays lightweight and fast to restart.
- If Docling OOMs or crashes, the backend keeps serving the UI.
- Can scale independently — run 2 replicas if ingestion is slow.
"""

import io
import logging
import re
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx

# Docling imports — the heavy stuff
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("docling-service")

# ──────────────────────────────────────────────
# Initialize converter once at startup.
# This loads the ML models into memory.
# ──────────────────────────────────────────────
converter: Optional[DocumentConverter] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load Docling models once on startup. Takes 10-30s depending on hardware."""
    global converter
    logger.info("Loading Docling models... this may take a moment.")
    converter = DocumentConverter()
    logger.info("Docling models loaded successfully.")
    yield
    logger.info("Shutting down Docling service.")


app = FastAPI(
    title="SmartTender Docling OCR",
    description="PDF/Image → Structured Text extraction service",
    version="1.0.0",
    lifespan=lifespan,
)


# ──────────────────────────────────────────────
# Health check — used by Docker Compose
# ──────────────────────────────────────────────
@app.get("/health")
async def health():
    if converter is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet")
    return {"status": "healthy", "service": "docling"}


# ──────────────────────────────────────────────
# Response models
# ──────────────────────────────────────────────
class PageBlockResponse(BaseModel):
    """One block of extracted content from a document page."""
    page_num: int
    block_index: int
    block_type: str          # "text", "table", "figure", "header", etc.
    text: str                # Extracted text content
    confidence: float        # OCR confidence 0.0-1.0; native PDFs get 1.0
    bbox: list[float] | None = None  # [x0, y0, x1, y1] bounding box if available


class ExtractionResponse(BaseModel):
    """Full extraction result for a document."""
    filename: str
    num_pages: int
    page_blocks: list[PageBlockResponse]
    avg_confidence: float    # Average confidence across all blocks
    organization_name: Optional[str] = None  # Extracted organization name if found


# ──────────────────────────────────────────────
# Main extraction endpoint
# ──────────────────────────────────────────────
@app.post("/extract", response_model=ExtractionResponse)
async def extract_document(
    file: UploadFile = File(...),
):
    """
    Accept a PDF or image file, run Docling extraction,
    return structured page blocks and extracted organization name.

    Called by: n8n Workflow 1 (Document Ingestion) via HTTP Request node.
    """

    if converter is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    # Validate file type
    allowed_types = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/tiff",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Allowed: {allowed_types}",
        )

    try:
        # Read file bytes
        content = await file.read()
        logger.info(f"Processing file: {file.filename} ({len(content)} bytes)")

        # Docling expects a file path or stream — we use a temp approach
        # by writing to an in-memory source
        import tempfile
        import os

        # Write to temp file because Docling needs a file path
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            # Run conversion
            result = converter.convert(tmp_path)

            page_blocks: list[PageBlockResponse] = []
            block_idx = 0

            # Iterate through the document result
            for item in result.document.texts:
                page_blocks.append(PageBlockResponse(
                    page_num=getattr(item.prov[0], "page_no", 1) if item.prov else 1,
                    block_index=block_idx,
                    block_type=item.label if hasattr(item, "label") else "text",
                    text=item.text,
                    confidence=getattr(item, "confidence", 0.95),
                    bbox=None,
                ))
                block_idx += 1

            # Extract tables separately
            for table in result.document.tables:
                table_text = table.export_to_markdown() if hasattr(table, "export_to_markdown") else str(table)
                page_blocks.append(PageBlockResponse(
                    page_num=getattr(table.prov[0], "page_no", 1) if table.prov else 1,
                    block_index=block_idx,
                    block_type="table",
                    text=table_text,
                    confidence=getattr(table, "confidence", 0.90),
                    bbox=None,
                ))
                block_idx += 1

            # Calculate average confidence
            confidences = [b.confidence for b in page_blocks]
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

            num_pages = max((b.page_num for b in page_blocks), default=1)

            logger.info(
                f"Extracted {len(page_blocks)} blocks from {num_pages} pages, "
                f"avg confidence: {avg_conf:.2f}"
            )

            # Extract organization name from the first page text
            organization_name = None
            first_page_text = " ".join(
                b.text for b in page_blocks if b.page_num == 1
            )
            if first_page_text:
                organization_name = extract_organization_name(first_page_text)
                if organization_name:
                    logger.info(f"Extracted organization name: {organization_name}")

            return ExtractionResponse(
                filename=file.filename or "unknown",
                num_pages=num_pages,
                page_blocks=page_blocks,
                avg_confidence=avg_conf,
                organization_name=organization_name,
            )

        finally:
            # Clean up temp file
            os.unlink(tmp_path)

    except Exception as e:
        logger.error(f"Extraction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Document extraction failed: {str(e)}",
        )


# ──────────────────────────────────────────────
# Helper functions for organization extraction
# ──────────────────────────────────────────────
def extract_organization_name(text: str) -> Optional[str]:
    """
    Extract organization/company name from document text.
    Looks for common patterns and suffixes.
    """
    if not text:
        return None
        
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    # Only look at the top of the document (first 50 lines)
    header_lines = lines[:50]
    
    # Priority 1: Explicit labels with name
    explicit_patterns = [
        r'(?:Organization|Company|Firm|Bidder|Name)\s*[:\-]\s*([^,\n]{3,100})',
        r'M/s\.?\s+([^,\n]{3,100})',
        r'Messrs\.?\s+([^,\n]{3,100})',
    ]
    
    for line in header_lines:
        for pattern in explicit_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                if len(name) > 2:
                    return cleanup_name(name)
    
    # Priority 2: Lines containing common company suffixes
    suffixes = [
        'Ltd', 'Inc', 'Corp', 'LLC', 'Private Limited', 'Pvt. Ltd', 
        'Enterprises', 'Industries', 'Solutions', 'Group', 'Associates',
        'Corporation', 'Company', 'Limited'
    ]
    for line in header_lines:
        # Skip lines that are clearly addresses or contact info
        if any(keyword in line.lower() for keyword in ['page', 'date', 'tel:', 'email:', 'address:', 'road', 'street', 'city']):
            continue
            
        for suffix in suffixes:
            if re.search(r'\b' + re.escape(suffix) + r'\b', line, re.IGNORECASE):
                # Ensure it looks like a name (starts with capital, reasonable word count)
                if line[0].isupper() and 2 <= len(line.split()) <= 10:
                    return cleanup_name(line)
    
    return None

def cleanup_name(name: str) -> str:
    """Clean up noise from extracted organization names."""
    # Remove trailing/leading punctuation and symbols
    name = re.sub(r'[:\-]$', '', name).strip()
    name = re.sub(r'^[:\-]', '', name).strip()
    name = name.strip('.,()\"\' ')
    return name
