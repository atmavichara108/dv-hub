#!/bin/bash
set -euo pipefail

VPS_USER="dv"
VPS_HOST="re-search.wiki"
VPS_PORT="28108"
SSH_KEY="${HOME}/.ssh/id_ed25519"
REMOTE_DIR="/opt/mirotalksfu"

echo "=== MiroTalk SFU Deploy → VPS ==="

# Step 1: Clone or update MiroTalk SFU on VPS
echo "→ Cloning/updating MiroTalk SFU on VPS..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  if [ -d "/opt/mirotalksfu/.git" ]; then
    cd /opt/mirotalksfu
    git pull origin main
  else
    cd /opt
    git clone https://github.com/miroslavpejic85/mirotalksfu.git
    cd mirotalksfu
  fi
REMOTE

# Step 2: Setup .env from .env.template
echo "→ Setting up .env..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  cd /opt/mirotalksfu
  if [ ! -f ".env" ]; then
    if [ -f ".env.template" ]; then
      cp .env.template .env
    else
      cat > .env << 'ENVEOF'
# Server
HTTP_PORT=3010
HTTPS=false
HOST=0.0.0.0

# Database
DB_PATH=./data/mirotalk.db

# MediaSoup
SFU_ANNOUNCED_IP=89.127.198.185

# API
API_KEY_SECRET=
API_KEY_SALT=

# TURN
TURN_URL=
TURN_USERNAME=
TURN_CREDENTIAL=

# Logging
LOG_LEVEL=info
ENVEOF
    fi
    echo "Created .env"
  fi
  # Verify .env has required vars
  grep -E "HTTP_PORT|HTTPS|SFU_ANNOUNCED_IP|API_KEY_SECRET" .env
REMOTE

# Step 3: Install dependencies and build
echo "→ Installing dependencies and building..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  cd /opt/mirotalksfu
  source ~/.nvm/nvm.sh
  nvm use 22
  npm ci
  npm run build:mediasoup-client
REMOTE

# Step 4: Start/restart via PM2
echo "→ Starting/restarting MiroTalk SFU via PM2..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  cd /opt/mirotalksfu
  source ~/.nvm/nvm.sh
  nvm use 22
  pm2 delete mirotalksfu 2>/dev/null || true
  pm2 start npm --name mirotalksfu -- run start
  pm2 save
  pm2 startup
REMOTE

# Step 5: Check firewall ports
echo "→ Checking firewall ports..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  # Check if media ports are open
  if ! sudo ufw status | grep -q "40000:40100"; then
    echo "⚠️  WARNING: Media ports 40000-40100 not open!"
    echo "Run these commands to open them:"
    echo "  sudo ufw allow 40000:40100/tcp comment 'MiroTalk media TCP'"
    echo "  sudo ufw allow 40000:40100/udp comment 'MiroTalk media UDP'"
    echo "  sudo ufw reload"
  else
    echo "✓ Media ports 40000-40100 are open"
  fi
REMOTE

# Step 6: Verify
echo "→ Verifying deployment..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  source ~/.nvm/nvm.sh
  nvm use 22
  pm2 status mirotalksfu
  sleep 3
  curl -I http://localhost:3010
REMOTE

echo "=== Deploy complete ==="
echo ""
echo "Post-deploy manual steps:"
echo "1. Edit /opt/mirotalksfu/.env and set SFU_ANNOUNCED_IP=89.127.198.185"
echo "2. Set API_KEY_SECRET=$(openssl rand -hex 32)"
echo "3. Run: pm2 restart mirotalksfu"
echo "4. Open https://meet.re-search.wiki to verify"