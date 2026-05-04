# SmartTender AI — Scripts

Quick-start commands for the entire platform.

## 🚀 Start Everything

```powershell
# Windows (PowerShell)
.\scripts\start.ps1

# Skip AI model download (if already pulled)
.\scripts\start.ps1 -SkipModels

# Force rebuild Docker images
.\scripts\start.ps1 -Build
```

```bash
# Linux / macOS
./scripts/start.sh
./scripts/start.sh --skip-models
./scripts/start.sh --build
```

### What `start` does (in order):
1. ✅ Checks Docker, Docker Compose, and Node.js are installed
2. 📄 Creates `.env` from `.env.example` if missing
3. 🤖 Pulls AI models via Docker Model Runner (~8.9 GB, one-time)
4. 🐳 Runs `docker compose up -d` for all services
5. ⏳ Waits for each service to become healthy
6. 📋 Prints service URLs

## 🧪 Test Everything

```powershell
# Windows
.\scripts\test.ps1        # Full test suite
.\scripts\test.ps1 -Quick  # Smoke test only
```

### What `test` checks:
| Category | Tests |
|---|---|
| Docker Containers | All 6 services running |
| Port Connectivity | Ports 5432, 6379, 6333, 8000, 5678, 8001 |
| Health Endpoints | Backend, Qdrant, Docling |
| API Smoke Tests | GET/POST /tenders, Swagger UI |
| Database | PostgreSQL via backend health check |
| n8n | Orchestrator reachable |
| Redis | PING/PONG |

## 🛑 Stop Everything

```powershell
# Windows
.\scripts\stop.ps1        # Stop containers (data preserved)
.\scripts\stop.ps1 -Clean  # Stop + delete all volumes (full reset)
```

```bash
# Linux / macOS
./scripts/stop.sh
./scripts/stop.sh --clean
```

## 📋 View Logs

```powershell
.\scripts\logs.ps1              # All services (follow mode)
.\scripts\logs.ps1 backend      # Backend only
.\scripts\logs.ps1 backend -n 50 # Last 50 lines
```

## 🌐 Service URLs (after start)

| Service | URL | Notes |
|---|---|---|
| Backend API | http://localhost:8000 | FastAPI |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Health Check | http://localhost:8000/health | All dependencies |
| n8n Workflows | http://localhost:5678 | Login: `admin` / `smarttender_n8n` |
| Qdrant Dashboard | http://localhost:6333/dashboard | Vector store |
| Docling OCR | http://localhost:8001/health | OCR microservice |
| Frontend | http://localhost:5173 | Run `npm run dev` separately |

## ⚡ Frontend (separate)

The frontend runs outside Docker for hot-reload:

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## 📋 Prerequisites

- **Docker Desktop** with Docker Model Runner enabled
  - Settings → Features in development → Docker Model Runner
- **16 GB RAM** recommended (for 3 AI models simultaneously)
- **Node.js 18+** (for frontend dev server)
