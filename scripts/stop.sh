#!/usr/bin/env bash
# SmartTender AI — Stop Script (Bash)
set -e
cd "$(dirname "$0")/.."

if [ "$1" = "--clean" ]; then
  echo "Stopping + removing volumes..."
  docker compose down -v
else
  docker compose down
  echo "Volumes preserved."
fi
echo "Done. Run ./scripts/start.sh to restart."
