# SmartTender AI — Startup Script (PowerShell)
# Usage:
#   .\scripts\start.ps1              # Start all services
#   .\scripts\start.ps1 -SkipModels  # Skip model pulling
#   .\scripts\start.ps1 -Build       # Force rebuild images

param(
    [switch]$SkipModels,
    [switch]$Build
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot)

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "   [WARN] $msg" -ForegroundColor Yellow }

Write-Host "`n=== SmartTender AI — Startup ===" -ForegroundColor Magenta

# 1. Prerequisites
Write-Step "Checking prerequisites..."
try { docker --version | Out-Null; Write-OK "Docker installed" } catch { Write-Host "Docker not found!"; exit 1 }
try { docker info *>$null; Write-OK "Docker running" } catch { Write-Host "Start Docker Desktop!"; exit 1 }
try { docker compose version | Out-Null; Write-OK "Compose available" } catch { Write-Host "Compose not found!"; exit 1 }

# 2. Create .env
Write-Step "Environment setup..."
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-OK "Created .env from .env.example"
} else { Write-OK ".env exists" }

# 3. Pull AI models
if (-not $SkipModels) {
    Write-Step "Pulling AI models (one-time, ~8.9 GB)..."
    @("ai/mistral-7b-instruct-q4","ai/nomic-embed-text","ai/llava-7b") | ForEach-Object {
        Write-Host "   Pulling $_..." -ForegroundColor DarkGray
        docker model pull $_ 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-OK $_ } else { Write-Warn "Failed: $_ (enable Docker Model Runner)" }
    }
}

# 4. Start services
Write-Step "Starting Docker Compose..."
$args2 = @("compose","up","-d")
if ($Build) { $args2 += "--build" }
docker @args2
if ($LASTEXITCODE -ne 0) { Write-Host "Compose failed!"; exit 1 }

# 5. Wait for health
Write-Step "Waiting for services..."
$checks = @(
    @{n="postgres";p=5432}, @{n="redis";p=6379},
    @{n="qdrant";p=6333},  @{n="backend";p=8000}
)
foreach ($s in $checks) {
    $ok = $false; $t = 0
    while (-not $ok -and $t -lt 90) {
        Start-Sleep 3; $t += 3
        try { $c = New-Object Net.Sockets.TcpClient; $c.Connect("localhost",$s.p); $c.Close(); $ok=$true } catch {}
    }
    if ($ok) { Write-OK "$($s.n) ready (${t}s)" } else { Write-Warn "$($s.n) not ready" }
}

# 6. Summary
Write-Host "`n=== All Services Started ===" -ForegroundColor Green
Write-Host "  Backend API:    http://localhost:8000"
Write-Host "  API Docs:       http://localhost:8000/docs"
Write-Host "  Health Check:   http://localhost:8000/health"
Write-Host "  n8n Workflows:  http://localhost:5678"
Write-Host "  Qdrant:         http://localhost:6333/dashboard"
Write-Host "  Docling OCR:    http://localhost:8001/health"
Write-Host ""
Write-Host "  Frontend: cd frontend && npm install && npm run dev" -ForegroundColor Yellow
Write-Host "  Test:     .\scripts\test.ps1" -ForegroundColor Yellow
Write-Host "  Stop:     .\scripts\stop.ps1" -ForegroundColor Yellow
Write-Host ""
