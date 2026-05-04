"""
n8n Webhook Client
==================
Thin wrapper around httpx for triggering n8n workflows.

Why a separate module:
- Centralizes the n8n base URL so you don't scatter it across routers.
- Adds logging and timeout handling — n8n can be slow to respond if
  it's mid-execution.
- Makes it testable — mock this module in tests instead of httpx directly.

Usage:
    from app.services.n8n_client import trigger_webhook
    await trigger_webhook("document-ingestion", {"document_id": "..."})
"""

import logging
import httpx

from app.config import settings

logger = logging.getLogger("smarttender.n8n_client")

# Timeout: 10s connect, 30s read.
# n8n webhooks respond quickly (just ack), but the initial request
# might be slow if n8n is cold-starting.
TIMEOUT = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)


async def trigger_webhook(workflow_name: str, payload: dict) -> dict:
    """
    Fire a webhook POST to n8n.

    Args:
        workflow_name: Maps to the n8n webhook path, e.g., "document-ingestion"
                       becomes POST http://n8n:5678/webhook/document-ingestion
        payload: JSON body to send.

    Returns:
        The JSON response from n8n (usually just an ack).

    Raises:
        httpx.HTTPError: If n8n is unreachable or returns an error.
    """
    url = f"{settings.N8N_WEBHOOK_BASE_URL}/{workflow_name}"
    logger.info(f"Triggering n8n webhook: POST {url}")

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()

        logger.info(f"n8n responded: {response.status_code}")
        return response.json() if response.content else {}
