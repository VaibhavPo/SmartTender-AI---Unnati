#!/usr/bin/env bash
# ==============================================================================
# SmartTender AI — AWS EC2 Deployment and Startup Script
# ==============================================================================
# This script automates the full deployment on an AWS EC2 Ubuntu instance:
# 1. Installs Docker & Docker Compose (if missing)
# 2. Configures Docker logging limits to prevent disk issues
# 3. Detects public & private IP addresses
# 4. Configures a production-ready .env file with secure generated passwords
# 5. Starts all SmartTender AI services via Docker Compose
# 6. Performs health checks and prints connection endpoints
# ==============================================================================

set -eo pipefail

# Print styled messages
log_info() { echo -e "\033[1;34m[INFO]\033[0m $1"; }
log_ok() { echo -e "\033[1;32m[OK]\033[0m $1"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; }
log_error() { echo -e "\033[1;31m[ERROR]\033[0m $1"; exit 1; }

# Parse arguments
NON_INTERACTIVE=false
CUSTOM_DOMAIN=""
N8N_WEBHOOK=""

for arg in "$@"; do
  case $arg in
    --non-interactive|-y) NON_INTERACTIVE=true ;;
    --domain=*) CUSTOM_DOMAIN="${arg#*=}" ;;
    --n8n-webhook=*) N8N_WEBHOOK="${arg#*=}" ;;
    *) ;;
  esac
done

echo "======================================================================"
echo "          SmartTender AI — AWS EC2 Automated Deployment               "
echo "======================================================================"

# 1. Ensure running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
  log_warn "This script is designed for Linux (specifically Ubuntu on EC2)."
  if [ "$NON_INTERACTIVE" = false ]; then
    read -p "Do you want to continue anyway? (y/N): " choice
    if [[ ! "$choice" =~ ^[Yy]$ ]]; then
      log_error "Deployment aborted."
    fi
  fi
fi

# 2. Detect/Install Docker & Docker Compose
log_info "Verifying Docker installation..."
if ! command -v docker &> /dev/null; then
  log_info "Docker is not installed. Installing Docker..."
  sudo apt-get update -y
  sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release
  
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  
  # Group membership setup
  sudo usermod -aG docker "$USER"
  log_ok "Docker Engine and Compose plugin installed."
  log_warn "You might need to log out and log back in for docker group permissions to take effect on your user."
else
  log_ok "Docker is already installed: $(docker --version)"
fi

# Check Docker Compose version
if ! docker compose version &>/dev/null; then
  log_info "Installing docker-compose-plugin..."
  sudo apt-get update -y && sudo apt-get install -y docker-compose-plugin
fi
log_ok "Docker Compose is available: $(docker compose version)"

# 3. Configure Docker logging options (daemon.json)
log_info "Configuring Docker daemon logging limits..."
if [ ! -f /etc/docker/daemon.json ]; then
  sudo mkdir -p /etc/docker
  sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
  log_info "Restarting Docker daemon..."
  sudo systemctl restart docker || true
  log_ok "Docker daemon logging limits configured."
else
  log_info "Docker daemon configuration already exists. Skipping."
fi

# 4. IP/Domain detection
log_info "Detecting IP addresses..."
PRIVATE_IP=$(hostname -I | awk '{print $1}')
log_info "Private IP detected: $PRIVATE_IP"

# Try IMDSv2 first for EC2
TOKEN=$(curl -s -m 3 -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)
if [ -n "$TOKEN" ]; then
  PUBLIC_IP=$(curl -s -m 3 -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
fi

# Fallback to public tools
if [ -z "$PUBLIC_IP" ]; then
  PUBLIC_IP=$(curl -s -m 5 ifconfig.me || curl -s -m 5 icanhazip.com || curl -s -m 5 ipinfo.io/ip || echo "")
fi

if [ -n "$PUBLIC_IP" ]; then
  log_ok "Public IP detected: $PUBLIC_IP"
else
  log_warn "Could not detect Public IP address automatically."
  if [ "$NON_INTERACTIVE" = false ]; then
    read -p "Please enter your EC2 Public IP address (or leave empty if using localhost/domain): " PUBLIC_IP
  fi
  if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP="localhost"
  fi
fi

# Domain setup prompt
if [ -z "$CUSTOM_DOMAIN" ] && [ "$NON_INTERACTIVE" = false ]; then
  read -p "Do you have a custom domain pointing to this EC2 instance? (e.g. smarttender.com) [Press Enter to skip]: " CUSTOM_DOMAIN
fi

if [ -n "$CUSTOM_DOMAIN" ]; then
  HOST_NAME="$CUSTOM_DOMAIN"
  API_URL="https://$CUSTOM_DOMAIN/api/v1"
  FRONTEND_ORIGIN="https://$CUSTOM_DOMAIN"
  log_ok "Using custom domain: $HOST_NAME"
else
  HOST_NAME="$PUBLIC_IP"
  API_URL="http://$PUBLIC_IP:8000/api/v1"
  FRONTEND_ORIGIN="http://$PUBLIC_IP:5173"
  log_ok "Using Public IP-based endpoints: $FRONTEND_ORIGIN"
fi

# n8n webhook setup prompt
if [ -z "$N8N_WEBHOOK" ] && [ "$NON_INTERACTIVE" = false ]; then
  read -p "Please enter your n8n Cloud Webhook URL (e.g., https://username.n8n.cloud/webhook) [Press Enter to skip]: " N8N_WEBHOOK
fi

# 5. Pull local embedding model using Docker Model Runner
log_info "Pulling nomic-embed-text-v1.5 embedding model..."
if command -v docker >/dev/null && docker info | grep -q "Extensions:"; then
  # Try pulling using Docker GenAI / Model Runner extension if available
  docker model pull docker.io/nomic-embed-text-v1.5 || log_warn "docker model pull failed. You may need to pull it manually or ensure the Docker AI extension is active."
else
  log_warn "Docker Model Runner extension not detected. Skipping model pull."
fi

# 6. Configure Environment File (.env)
log_info "Configuring .env file..."
if [ ! -f .env ]; then
  cp .env.example .env
  log_ok ".env file created from .env.example"
else
  log_info ".env file already exists. Backing it up to .env.bak"
  cp .env .env.bak
fi

# Generate secure random DB password or reuse existing one from .env
if [ -f .env ] && grep -q "^POSTGRES_PASSWORD=" .env; then
  DB_PASS=$(grep "^POSTGRES_PASSWORD=" .env | cut -d'=' -f2-)
  # Strip quotes if they exist
  DB_PASS="${DB_PASS#\"}"
  DB_PASS="${DB_PASS%\"}"
  DB_PASS="${DB_PASS#\'}"
  DB_PASS="${DB_PASS%\'}"
  log_info "Reusing existing database password from .env"
else
  DB_PASS=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 || openssl rand -hex 16 || echo "smarttender_secure_prod_pass")
  log_info "Generated new secure database password."
fi

# Safe sed replacement helper function
replace_in_env() {
  local key="$1"
  local val="$2"
  # Escape values for sed
  local esc_val=$(echo "$val" | sed -e 's/\\/\\\\/g' -e 's/\//\\\//g' -e 's/&/\\&/g')
  if grep -q "^$key=" .env; then
    sed -i "s/^$key=.*/$key=$esc_val/" .env
  else
    echo "$key=$val" >> .env
  fi
}

replace_in_env "POSTGRES_PASSWORD" "$DB_PASS"
replace_in_env "DATABASE_URL" "postgresql+asyncpg://smarttender:$DB_PASS@postgres:5432/smarttender"
replace_in_env "CORS_ORIGINS" "http://localhost:5173,http://localhost:3000,$FRONTEND_ORIGIN"
replace_in_env "VITE_API_BASE_URL" "$API_URL"

if [ -n "$N8N_WEBHOOK" ]; then
  replace_in_env "N8N_WEBHOOK_BASE_URL" "$N8N_WEBHOOK"
fi

log_ok ".env file configured successfully."

# 6. Start Services via Docker Compose
log_info "Starting SmartTender AI stack via Docker Compose..."
docker compose down
docker compose up -d --build

# 7. Service Health Check & Wait
log_info "Waiting for services to become healthy..."
MAX_ATTEMPTS=30
ATTEMPT=1
HEALTHY=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  # Check backend health endpoint
  HEALTH_RESP=$(curl -s http://localhost:8000/health || curl -s http://localhost:8000/api/v1/health || echo "")
  if echo "$HEALTH_RESP" | grep -q '"status":"healthy"'; then
    HEALTHY=true
    break
  fi
  
  log_info "Checking health... (Attempt $ATTEMPT/$MAX_ATTEMPTS). Waiting 5s..."
  sleep 5
  ATTEMPT=$((ATTEMPT + 1))
done

if [ "$HEALTHY" = "true" ]; then
  log_ok "All services are running and healthy!"
else
  log_warn "FastAPI health check timed out. Checking running containers..."
  docker compose ps
  log_warn "Please check backend logs with: docker compose logs backend"
fi

# 8. Summary & Connection Details
echo "======================================================================"
echo "          SmartTender AI — Deployment Summary                         "
echo "======================================================================"
echo "  Frontend URL:     $FRONTEND_ORIGIN"
echo "  Backend API:      http://$HOST_NAME:8000"
echo "  API Health Check: http://$HOST_NAME:8000/health"
echo "  API Docs:         http://$HOST_NAME:8000/docs"
echo "  n8n Workflows:    http://$HOST_NAME:5678"
echo "  Qdrant Store:     http://$HOST_NAME:6333/dashboard"
echo "  Docling OCR:      http://$HOST_NAME:8001/health"
echo "======================================================================"
echo "Next Steps:"
echo "1. Verify you opened ports 80, 443, 8000, 5173, and 5678 in your"
echo "   AWS EC2 Security Group."
echo "2. Open n8n Workflows UI (http://$HOST_NAME:5678) and log in with"
echo "   username: admin / password: smarttender_n8n."
echo "3. Configure your Amazon Bedrock / SageMaker credentials inside n8n."
echo "4. The n8n-import container has automatically pre-loaded and activated"
echo "   the local workflows for you."
echo "======================================================================"
