"""
Reports Router
==============
Trigger report generation and serve the resulting PDF.

Called by: React (Report screen).
"""

import os
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.schemas import ReportRequest
from app.models.db_models import TenderDB, AuditEventDB
from app.services.n8n_client import trigger_webhook

logger = logging.getLogger("smarttender.reports")

router = APIRouter(prefix="/reports")


# ── POST /reports/generate — Trigger report generation ──
@router.post("/generate")
async def generate_report(body: ReportRequest, db: AsyncSession = Depends(get_db)):
    """
    POST /api/v1/reports/generate — Trigger n8n Workflow 5.
    Called by: React (officer clicks "Generate Report").

    n8n builds the report, renders it to PDF via WeasyPrint,
    and POSTs the result back to /webhooks/report-ready.
    """
    result = await db.execute(select(TenderDB).where(TenderDB.id == body.tender_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tender not found")

    try:
        await trigger_webhook("report-generation", {
            "tender_id": body.tender_id,
            "include_audit_trail": body.include_audit_trail,
        })
        return {"message": "Report generation triggered", "tender_id": body.tender_id}
    except Exception as e:
        logger.error(f"Failed to trigger report generation: {e}")
        raise HTTPException(status_code=502, detail="Could not reach n8n workflow")


# ── GET /reports/{tender_id}/download — Download the PDF ──
@router.get("/{tender_id}/download")
async def download_report(tender_id: str):
    """
    GET /api/v1/reports/{tender_id}/download — Serve the generated PDF.
    Called by: React (Report screen download button).
    """
    report_path = os.path.join(settings.REPORT_DIR, f"{tender_id}_report.pdf")

    if not os.path.exists(report_path):
        raise HTTPException(
            status_code=404,
            detail="Report not found. Has it been generated yet?",
        )

    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=f"tender_evaluation_report_{tender_id}.pdf",
    )


# ── POST /reports/render-pdf — Render HTML to PDF (called by n8n) ──
@router.post("/render-pdf")
async def render_pdf(
    tender_id: str,
    html_content: str,
    db: AsyncSession = Depends(get_db),
):
    """
    POST /api/v1/reports/render-pdf — Render HTML to PDF using WeasyPrint.
    Called by: n8n Workflow 5 after building the report HTML.

    Why WeasyPrint runs here instead of in n8n:
    - WeasyPrint is a Python library — much easier to use in FastAPI.
    - n8n would need a custom Docker image with WeasyPrint installed.
    """
    try:
        from weasyprint import HTML

        os.makedirs(settings.REPORT_DIR, exist_ok=True)
        report_path = os.path.join(settings.REPORT_DIR, f"{tender_id}_report.pdf")

        HTML(string=html_content).write_pdf(report_path)
        logger.info(f"Rendered PDF report: {report_path}")

        # Write audit event
        audit = AuditEventDB(
            id=str(uuid.uuid4()),
            tender_id=tender_id,
            event_type="REPORT_GENERATED",
            actor="system",
            entity_type="report",
            entity_id=tender_id,
        )
        db.add(audit)
        await db.flush()

        return {
            "message": "PDF rendered successfully",
            "download_url": f"/api/v1/reports/{tender_id}/download",
        }

    except Exception as e:
        logger.error(f"PDF rendering failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF rendering failed: {str(e)}")
