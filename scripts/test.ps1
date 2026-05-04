# SmartTender AI — Test Script (PowerShell)
# Usage:
#   .\scripts\test.ps1           # Run all tests
#   .\scripts\test.ps1 -Quick    # Quick smoke test only

param([switch]$Quick)

$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot)

$pass = 0; $fail = 0; $warn = 0
function Test-Pass($name) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
function Test-Fail($name,$err) { Write-Host "  FAIL  $name — $err" -ForegroundColor Red; $script:fail++ }
function Test-Warn($name,$err) { Write-Host "  WARN  $name — $err" -ForegroundColor Yellow; $script:warn++ }

Write-Host "`n=== SmartTender AI — Test Suite ===" -ForegroundColor Magenta

# ── Section 1: Docker Services Running ──
Write-Host "`n--- Docker Services ---" -ForegroundColor Cyan
$expected = @("postgres","redis","qdrant","docling","n8n","backend")
foreach ($svc in $expected) {
    $state = docker compose ps --format "{{.State}}" $svc 2>&1
    if ($state -match "running") { Test-Pass "Container: $svc" }
    else { Test-Fail "Container: $svc" "State=$state" }
}

# ── Section 2: Port Connectivity ──
Write-Host "`n--- Port Connectivity ---" -ForegroundColor Cyan
$ports = @(
    @{n="PostgreSQL";p=5432}, @{n="Redis";p=6379}, @{n="Qdrant";p=6333},
    @{n="Backend";p=8000}, @{n="n8n";p=5678}, @{n="Docling";p=8001}
)
foreach ($pt in $ports) {
    try {
        $c = New-Object Net.Sockets.TcpClient; $c.Connect("localhost",$pt.p); $c.Close()
        Test-Pass "$($pt.n) :$($pt.p)"
    } catch { Test-Fail "$($pt.n) :$($pt.p)" "Connection refused" }
}

# ── Section 3: Health Endpoints ──
Write-Host "`n--- Health Endpoints ---" -ForegroundColor Cyan
$endpoints = @(
    @{n="Backend /health"; u="http://localhost:8000/health"},
    @{n="Qdrant /healthz"; u="http://localhost:6333/healthz"},
    @{n="Docling /health"; u="http://localhost:8001/health"}
)
foreach ($ep in $endpoints) {
    try {
        $r = Invoke-WebRequest -Uri $ep.u -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { Test-Pass $ep.n }
        else { Test-Warn $ep.n "HTTP $($r.StatusCode)" }
    } catch { Test-Fail $ep.n "$_" }
}

# ── Section 4: Backend API Smoke Tests ──
Write-Host "`n--- Backend API Smoke Tests ---" -ForegroundColor Cyan
$BASE = "http://localhost:8000/api/v1"

# GET /api/v1/tenders
try {
    $r = Invoke-WebRequest "$BASE/tenders" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq 200) { Test-Pass "GET /tenders" } else { Test-Fail "GET /tenders" "HTTP $($r.StatusCode)" }
} catch { Test-Fail "GET /tenders" "$_" }

# POST /api/v1/tenders — create a test tender
$tenderBody = '{"name":"Test Tender","description":"Automated test","department":"QA","budget":100000}'
try {
    $r = Invoke-WebRequest "$BASE/tenders" -Method POST -Body $tenderBody -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    $tender = $r.Content | ConvertFrom-Json
    if ($tender.id) {
        Test-Pass "POST /tenders (id=$($tender.id))"
        $testTenderId = $tender.id
    } else { Test-Fail "POST /tenders" "No id in response" }
} catch { Test-Fail "POST /tenders" "$_" }

# GET /api/v1/tenders/{id}
if ($testTenderId) {
    try {
        $r = Invoke-WebRequest "$BASE/tenders/$testTenderId" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { Test-Pass "GET /tenders/$testTenderId" } else { Test-Fail "GET /tenders/$testTenderId" "HTTP $($r.StatusCode)" }
    } catch { Test-Fail "GET /tenders/$testTenderId" "$_" }
}

# OpenAPI docs
try {
    $r = Invoke-WebRequest "http://localhost:8000/docs" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq 200) { Test-Pass "GET /docs (Swagger UI)" } else { Test-Fail "GET /docs" "HTTP $($r.StatusCode)" }
} catch { Test-Fail "GET /docs" "$_" }

if ($Quick) {
    Write-Host "`n--- Quick mode: skipping extended tests ---" -ForegroundColor Yellow
} else {
    # ── Section 5: Database connectivity via backend ──
    Write-Host "`n--- Database Integration ---" -ForegroundColor Cyan
    try {
        $r = Invoke-WebRequest "http://localhost:8000/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        $health = $r.Content | ConvertFrom-Json
        if ($health.checks.postgres.status -eq "healthy") { Test-Pass "PostgreSQL via backend health" }
        else { Test-Fail "PostgreSQL" "$($health.checks.postgres.error)" }
        if ($health.checks.qdrant.status -eq "healthy") { Test-Pass "Qdrant via backend health" }
        else { Test-Warn "Qdrant" "$($health.checks.qdrant.error)" }
        if ($health.checks.model_runner.status -eq "healthy") { Test-Pass "Model Runner via backend health" }
        else { Test-Warn "Model Runner" "Not reachable (enable Docker Model Runner)" }
    } catch { Test-Fail "Health deep check" "$_" }

    # ── Section 6: n8n API ──
    Write-Host "`n--- n8n Orchestrator ---" -ForegroundColor Cyan
    try {
        $cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:smarttender_n8n"))
        $headers = @{ Authorization = "Basic $cred" }
        $r = Invoke-WebRequest "http://localhost:5678/healthz" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { Test-Pass "n8n health" } else { Test-Warn "n8n health" "HTTP $($r.StatusCode)" }
    } catch { Test-Warn "n8n health" "May need different endpoint" }

    # ── Section 7: Redis ──
    Write-Host "`n--- Redis ---" -ForegroundColor Cyan
    try {
        $ping = docker compose exec -T redis redis-cli ping 2>&1
        if ($ping -match "PONG") { Test-Pass "Redis PING/PONG" } else { Test-Fail "Redis" "No PONG" }
    } catch { Test-Fail "Redis" "$_" }
}

# ── Summary ──
Write-Host "`n===============================" -ForegroundColor Magenta
Write-Host "  Results: $pass passed, $fail failed, $warn warnings" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
Write-Host "===============================`n" -ForegroundColor Magenta

if ($fail -gt 0) { exit 1 } else { exit 0 }
