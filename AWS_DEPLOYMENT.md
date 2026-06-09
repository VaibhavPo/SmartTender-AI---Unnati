# AWS EC2 Deployment Guide — SmartTender AI

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS EC2 Instance                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Docker Compose Services:                            │   │
│  │  • PostgreSQL (Audit DB)                             │   │
│  │  • Redis (Cache + Rate Limiting)                     │   │
│  │  • Qdrant (Vector Store)                             │   │
│  │  • Docling (OCR Service)                             │   │
│  │  • FastAPI (CRUD API)                                │   │
│  │  • React (Frontend)                                  │   │
│  │  • Docker Model Runner (LLM inference)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
        ┌───────────────────────────────────────┐
        │      n8n Cloud (External)             │
        │  https://your-username.n8n.cloud      │
        │  - Workflows                          │
        │  - Credentials Management             │
        │  - Execution Logs                      │
        └───────────────────────────────────────┘
```

---

## 🎯 Step 1: Choose EC2 Instance

### Recommended Instances

| Instance | vCPU | RAM  | Storage | Bandwidth | Price/hr | Best For |
|----------|------|------|---------|-----------|----------|----------|
| **c5.2xlarge** | 8 | 16GB | 100GB | Up to 10Gbps | $0.34 | **Production** |
| **c6i.2xlarge** | 8 | 16GB | 100GB | Up to 12.5Gbps | $0.34 | **Production (Newer)** |
| **c5.4xlarge** | 16 | 32GB | 100GB | Up to 10Gbps | $0.68 | **High Traffic** |
| **t3.2xlarge** | 8 | 32GB | 100GB | Up to 5Gbps | $0.33 | **Bursty Workloads** |

**💰 Cost Estimates (US East 1):**
- **c5.2xlarge**: ~$250/month (reserved instance: ~$140/month)
- **c6i.2xlarge**: ~$250/month (reserved instance: ~$140/month)  
- **c5.4xlarge**: ~$500/month (reserved instance: ~$280/month)

### Storage Requirements
- **System + Docker**: 20GB
- **PostgreSQL Data**: 50GB+ (grows with tender documents)
- **Qdrant Vectors**: 20GB+ (embeddings storage)
- **Uploaded PDFs**: 100GB+ (depends on tender volume)
- **Total**: **150-200GB SSD (gp3 recommended)**

---

## 🚀 Step 2: EC2 Setup & Docker Installation

### 2.1 Launch EC2 Instance

1. **AWS Console** → EC2 → Instances → "Launch instances"
2. **AMI**: Ubuntu 22.04 LTS (ami-0c55b159cbfafe1f0 or latest)
3. **Instance Type**: `c5.2xlarge`
4. **Storage**: 150GB gp3 (default is gp2, switch to gp3 for better performance)
5. **Security Group**:
   ```
   - SSH (22): Your IP only
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   - Custom TCP (8000): 0.0.0.0/0 [FastAPI]
   - Custom TCP (5173): Optional [React dev]
   ```
6. **Key Pair**: Create and save `.pem` file securely
7. **Launch** → Note the Public IP

### 2.2 SSH into Instance

```bash
chmod 600 your-key.pem
ssh -i your-key.pem ubuntu@<PUBLIC_IP>
```

### ⚡ Alternative: Automated Deployment (Highly Recommended)

To automate the entire process (installing Docker, configuring the daemon, setting up the `.env` file with secure generated passwords, and launching the services), you can run the unified deployment script:

```bash
# Clone the repository (if not already done)
cd /opt
sudo git clone https://github.com/your-org/smarttender-ai.git
sudo chown -R ubuntu:ubuntu smarttender-ai
cd smarttender-ai

# Make the script executable and run it
chmod +x deploy_ec2.sh
./deploy_ec2.sh
```

The script will guide you through the process, auto-detect your EC2 IP addresses, generate secure passwords, and start all services. Once finished, it will display all connection endpoints.

---

### Manual Setup (Step-by-Step)

If you prefer to configure everything manually, follow the steps below.

### 2.3 Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose-plugin

# Add ubuntu user to docker group (no sudo needed)
sudo usermod -aG docker ubuntu
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 2.4 Optional: Configure Docker Daemon Log Rotation

```bash
# Configure Docker log rotation to prevent disk exhaustion
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker daemon
sudo systemctl restart docker
```

---

## 📦 Step 3: Deploy SmartTender AI

### 3.1 Clone Repository

```bash
cd /opt
sudo git clone https://github.com/your-org/smarttender-ai.git
sudo chown -R ubuntu:ubuntu smarttender-ai
cd smarttender-ai
```

### 3.2 Configure Environment

```bash
# Copy example .env
cp .env.example .env

# Edit .env with production values
nano .env
```

**Critical settings for AWS:**

```bash
# Database (change password!)
POSTGRES_PASSWORD=<GENERATE_SECURE_PASSWORD>
POSTGRES_USER=smarttender_prod

# Docker Model Runner on EC2
MODEL_RUNNER_BASE_URL=http://host.docker.internal/engines/llama.cpp/v1

# n8n Cloud webhook
N8N_WEBHOOK_BASE_URL=https://your-username.n8n.cloud/webhook

# CORS for production domain
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# API URLs
VITE_API_BASE_URL=https://yourdomain.com/api/v1

# Logging
LOG_LEVEL=INFO
```

### 3.3 Start Services

```bash
# Start all services in background
docker compose up -d

# Wait for services to be healthy (2-3 minutes)
sleep 30
docker compose ps

# View logs
docker compose logs -f backend

# Check health
curl http://localhost:8000/api/v1/health
```

### 3.4 Verify All Containers

```bash
docker compose ps

# Output should show:
# postgres      ✓ healthy
# redis         ✓ healthy
# qdrant        ✓ healthy
# docling       ✓ healthy
# backend       ✓ running
# frontend      ✓ running
```

---

## 🌐 Step 4: Configure n8n Cloud

### 4.1 Create n8n Cloud Account

1. Go to https://n8n.io/cloud
2. Sign up with email
3. Create workspace
4. Get your Cloud URL: `https://your-username.n8n.cloud`

### 4.2 Create n8n Workflows

Recreate the 5 workflows in n8n Cloud:

1. **Workflow 1: Document Ingestion**
   - Trigger: Webhook (`/webhook/document-ingestion`)
   - Nodes: Call Docling → Embed with Qdrant → POST to FastAPI
   - Callback: `http://<EC2_IP>:8000/api/v1/webhooks/ingestion-complete`

2. **Workflow 2: Criteria Extraction**
   - Trigger: Webhook (`/webhook/criteria-extraction`)
   - Nodes: Fetch tender → Call Mistral LLM → Extract criteria
   - Callback: `http://<EC2_IP>:8000/api/v1/webhooks/criteria-extracted`

3. **Workflow 3: Evidence Extraction**
   - Similar pattern with bidder document search

4. **Workflow 4: Verdict Engine**
   - LLM-based verdict logic

5. **Workflow 5: Report Generation**
   - Aggregates verdicts → HTML → PDF

### 4.3 Connect to Amazon Bedrock or SageMaker

In n8n Cloud, configure your AWS Bedrock or SageMaker credentials:

- **AWS Credentials**: Add your AWS Access Key, Secret Key, and Region.
- **Model Provider**: Select AWS Bedrock / SageMaker.
- **Model**: Select your chosen Amazon-specific model (e.g. Anthropic Claude 3 / 3.5 on Bedrock, or your hosted Llama-3 model).

Then in your LLM/Embedding nodes in the n8n workflows, select this AWS credential and model provider.

---

## 🔐 Step 5: SSL/TLS Setup (HTTPS)

### 5.1 Use AWS Certificate Manager + CloudFront

1. **Request certificate** in AWS Certificate Manager
   - Domain: `yourdomain.com` + `*.yourdomain.com`
   - Validation: DNS CNAME
   - Wait for approval (~5 min)

2. **Create CloudFront Distribution**
   - Origin: Your EC2 Public IP
   - Protocol: HTTP (CloudFront → EC2), HTTPS (Client → CloudFront)
   - SSL Certificate: Select from ACM
   - Cache behavior: None (API + React)

3. **Point DNS** to CloudFront URL

### 5.2 Optional: Self-Signed Cert (for testing)

```bash
# On EC2, generate certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/smarttender.key \
  -out /etc/ssl/certs/smarttender.crt

# Update docker-compose.yml to expose HTTPS port
# Map volume: /etc/ssl:/etc/ssl:ro
```

---

## 🔧 Step 6: Database Management

### 6.1 Initialize Database

```bash
# Run migrations (if using Alembic)
docker compose exec backend alembic upgrade head

# Or just let Docker startup initialize tables
# Check if tables exist:
docker compose exec postgres psql -U smarttender_prod -d smarttender -c "\dt"
```

### 6.2 Backup PostgreSQL

```bash
# One-time backup
docker compose exec -T postgres pg_dump -U smarttender_prod smarttender > backup.sql

# Automated daily backup (add to cron)
0 2 * * * docker compose -f /opt/smarttender-ai/docker-compose.yml \
  exec -T postgres pg_dump -U smarttender_prod smarttender > /backups/smarttender-$(date +\%Y\%m\%d).sql
```

### 6.3 Monitor Storage

```bash
# Check Qdrant disk usage
du -sh /var/lib/docker/volumes/smarttender-ai_qdrantdata/_data

# Check PostgreSQL size
docker compose exec postgres psql -U smarttender_prod smarttender -c "SELECT pg_size_pretty(pg_database_size('smarttender'));"

# Monitor free space
df -h /
```

---

## 📊 Step 7: Monitoring & Logging

### 7.1 View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f docling

# With timestamps
docker compose logs -f --timestamps
```

### 7.2 CloudWatch Integration (Optional)

```bash
# Send logs to AWS CloudWatch
# Install CloudWatch agent on EC2, configure to watch:
# - /var/lib/docker/containers/*/json.log (Docker logs)
# - /var/log/syslog (System logs)
```

### 7.3 Health Checks

```bash
# Set up monitoring script
cat > /opt/smarttender-ai/health-check.sh <<'EOF'
#!/bin/bash
curl -s http://localhost:8000/api/v1/health | grep -q '"status":"ok"' && echo "✓ OK" || echo "✗ FAILED"
EOF

# Add to cron (every 5 min)
*/5 * * * * /opt/smarttender-ai/health-check.sh >> /var/log/smarttender-health.log 2>&1
```

---

## 🚨 Step 8: Maintenance Tasks

### Regular Tasks

```bash
# Weekly: Check disk usage
docker exec $(docker ps -q -f name=postgres) psql -U smarttender_prod smarttender \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

# Monthly: Prune old Docker logs
docker system prune -a --volumes

# Export Qdrant collection for backup
docker compose exec qdrant curl -X POST http://localhost:6333/collections/tender_docs/snapshots
```

---

## 💡 Troubleshooting

### Services won't start
```bash
# Check for port conflicts
sudo lsof -i :8000
sudo lsof -i :5432
sudo lsof -i :6333

# Check Docker daemon
sudo systemctl status docker
sudo journalctl -u docker -n 50
```


### n8n Cloud webhook not connecting
```bash
# Test webhook from EC2
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  https://your-username.n8n.cloud/webhook/document-ingestion
```

### Qdrant connection fails
```bash
# Check Qdrant health
curl http://localhost:6333/health

# Reset Qdrant (careful!)
docker compose down
docker volume rm smarttender-ai_qdrantdata
docker compose up -d qdrant
```

---

## 📈 Performance Tuning

### EC2 Instance Optimization

```bash
# Disable swap (SSDs are fast enough)
sudo swapoff -a

# Increase Docker resource limits
# Edit /etc/docker/daemon.json to add:
{
  "storage-driver": "overlay2",
  "storage-opts": ["overlay2.override_kernel_check=true"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5"
  }
}
```

### PostgreSQL Tuning

```bash
# Connect to database
docker compose exec postgres psql -U smarttender_prod smarttender

# Analyze slow queries
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Create indexes for common queries
CREATE INDEX idx_tender_status ON tenders(status);
CREATE INDEX idx_verdict_tender_bidder ON verdict_events(tender_id, bidder_id);
```

---

## 🎉 Deployment Complete!

Your SmartTender AI instance is now running on AWS EC2 with:

✅ PostgreSQL for audit trail  
✅ Redis for caching  
✅ Qdrant for vector search  
✅ Docling for OCR  
✅ FastAPI backend  
✅ React frontend  
✅ Amazon Bedrock / SageMaker for LLM inference  
✅ n8n Cloud for workflow orchestration  

**Access your system:**
- Frontend: `https://yourdomain.com`
- API: `https://yourdomain.com/api/v1`
- Health: `https://yourdomain.com/api/v1/health`

**Cost per month (c5.2xlarge):**
- EC2 Instance: ~$250
- Data transfer: ~$20
- Storage: ~$10
- **Total: ~$280/month** (or ~$140 with 1-year reserved instance)
