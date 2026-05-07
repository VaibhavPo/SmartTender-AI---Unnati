# ──────────────────────────────────────────────
# Docling OCR Microservice
# Wraps the `docling` Python library in a thin
# FastAPI server. Accepts PDF/image → returns
# structured page blocks with confidence scores.
# ──────────────────────────────────────────────
FROM python:3.11-slim-bookworm

# System deps for PDF processing and image handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu


COPY main.py .

EXPOSE 8001

# Single worker because Docling is memory-heavy.
# Scale horizontally with replicas if needed.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
