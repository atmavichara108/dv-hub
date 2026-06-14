#!/usr/bin/env bash
# scripts/deploy-mirotalk.sh
# Deploy MiroTalk SFU to Fornex VPS (meet.re-search.wiki).
# Run from project root: bash scripts/deploy-mirotalk.sh
#
# Prerequisites:
#   - SSH key configured for dv@re-search.wiki (port 28108)
#   - Node.js 22+ installed on VPS (via nvm)
#   - PM2 installed globally on VPS
#   - Nginx configured with SSL for meet.re-search.wiki (DV-027)
#   - Ports 40000-40100 open in firewall (TCP + UDP)

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

# Step 2: Create .env if not exists
echo "→ Checking .env..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  cd /opt/mirotalksfu
  if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
    echo "IMPORTANT: Edit .env and set:"
    echo "  - HTTP_PORT=3010"
    echo "  - HTTPS=false"
    echo "  - SFU_ANNOUNCED_IP=89.127.198.185"
    echo "  - API_KEY_SECRET=$(openssl rand -hex 32)"
  else
    echo ".env already exists, skipping"
  fi
REMOTE

# Step 3: Install dependencies
echo "→ Installing dependencies..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  cd /opt/mirotalksfu
  npm install
REMOTE

# Step 4: Start or restart PM2
echo "→ Starting/restarting MiroTalk SFU..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  cd /opt/mirotalksfu
  pm2 delete mirotalksfu 2>/dev/null || true
  pm2 start ecosystem.config.js --name mirotalksfu
  pm2 save
REMOTE

# Step 5: Verify
echo "→ Verifying deployment..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  pm2 status mirotalksfu
  curl -sI http://localhost:3010 | head -5
REMOTE

echo "=== Deploy complete ==="
echo ""
echo "IMPORTANT: After deploy, manually:"
echo "1. Edit /opt/mirotalksfu/.env and set SFU_ANNOUNCED_IP=89.127.198.185"
echo "2. Set API_KEY_SECRET to a random value"
echo "3. Run: pm2 restart mirotalksfu"
echo "4. Open https://meet.re-search.wiki to verify"
