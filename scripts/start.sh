#!/usr/bin/env bash
# SmartTender AI — Startup Script (Bash)
# Usage:
#   ./scripts/start.sh              # Start all services
#   ./scripts/start.sh --skip-models # Skip model pulling
#   ./scripts/start.sh --build       # Force rebuild

set -e
cd "$(dirname "$0")/.."

SKIP_MODELS=false; BUILD=false
for arg in "$@"; do
  case $arg in --skip-models) SKIP_MODELS=true;; --build) BUILD=true;; esac
done

echo -e "\n=== SmartTender AI — Startup ===\n"

# 1. Prerequisites
echo ">> Checking prerequisites..."
command -v docker >/dev/null || { echo "Docker not found!"; exit 1; }
docker info >/dev/null 2>&1 || { echo "Start Docker!"; exit 1; }
echo "   [OK] Docker ready"

# 2. .env
if [ ! -f .env ]; then cp .env.example .env; echo "   [OK] .env created"; else echo "   [OK] .env exists"; fi

# 3. Models
if [ "$SKIP_MODELS" = false ]; then
  echo -e "\n>> Pulling AI models..."
  for m in ai/mistral-7b-instruct-q4 ai/nomic-embed-text ai/llava-7b; do
    echo "   Pulling $m..."
    docker model pull "$m" 2>/dev/null && echo "   [OK] $m" || echo "   [WARN] $m failed"
  done
fi

# 4. Start
echo -e "\n>> Starting Docker Compose..."
ARGS="up -d"
[ "$BUILD" = true ] && ARGS="up -d --build"
docker compose $ARGS

# 5. Wait
echo -e "\n>> Waiting for services..."
for pair in "postgres:5432" "redis:6379" "qdrant:6333" "backend:8000"; do
  name=${pair%%:*}; port=${pair##*:}; t=0
  while ! nc -z localhost "$port" 2>/dev/null && [ $t -lt 90 ]; do sleep 3; t=$((t+3)); done
  [ $t -lt 90 ] && echo "   [OK] $name (${t}s)" || echo "   [WARN] $name not ready"
done

# 6. Summary
echo -e "\n=== All Services Started ==="
echo "  Backend API:    http://localhost:8000"
echo "  API Docs:       http://localhost:8000/docs"
echo "  n8n Workflows:  http://localhost:5678"
echo "  Qdrant:         http://localhost:6333/dashboard"
echo "  Docling:        http://localhost:8001/health"
echo ""
echo "  Frontend: cd frontend && npm install && npm run dev"
echo "  Test:     ./scripts/test.sh"
echo "  Stop:     ./scripts/stop.sh"
echo ""
