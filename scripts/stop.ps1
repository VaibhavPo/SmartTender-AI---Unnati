# SmartTender AI — Stop Script (PowerShell)
# Usage:
#   .\scripts\stop.ps1          # Stop all services
#   .\scripts\stop.ps1 -Clean   # Stop + remove volumes (full reset)

param([switch]$Clean)

Set-Location (Split-Path $PSScriptRoot)

Write-Host "`n=== SmartTender AI — Stopping Services ===" -ForegroundColor Yellow

if ($Clean) {
    Write-Host "  Stopping containers and removing volumes..." -ForegroundColor Red
    docker compose down -v
    Write-Host "  All data volumes removed (clean slate)." -ForegroundColor Red
} else {
    docker compose down
    Write-Host "  Volumes preserved. Data will persist on next start." -ForegroundColor Green
}

Write-Host "`n  Done. Run .\scripts\start.ps1 to restart.`n" -ForegroundColor Cyan
