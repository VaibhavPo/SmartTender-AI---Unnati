"""
File Storage Service
====================
Handles saving and retrieving uploaded files.

For the hackathon: simple filesystem storage in a Docker volume.
For production: swap this for S3/MinIO by changing the implementation
here without touching any router code.
"""

import os
import logging

from app.config import settings

logger = logging.getLogger("smarttender.storage")


def ensure_upload_dir():
    """Create upload directory if it doesn't exist."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.REPORT_DIR, exist_ok=True)


def get_file_path(document_id: str, extension: str = ".pdf") -> str:
    """Get the filesystem path for a document."""
    return os.path.join(settings.UPLOAD_DIR, f"{document_id}{extension}")


def file_exists(document_id: str, extension: str = ".pdf") -> bool:
    """Check if a file exists on disk."""
    return os.path.exists(get_file_path(document_id, extension))
