#!/usr/bin/env bash
# scripts/remote-rebuild.sh
# Rebuild node_modules on VPS with correct Node version (nvm loaded)
set -euo pipefail

VPS_USER="dv"
VPS_HOST="re-search.wiki"
VPS_PORT="28108"
SSH_KEY="${HOME}/.ssh/id_ed25519"

ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  
  echo "Node version: $(node --version)"
  cd /opt/dv-hub
  
  echo "→ Removing old node_modules..."
  rm -rf node_modules
  
  echo "→ Running npm ci --omit=dev..."
  npm ci --omit=dev
  
  echo "→ Restarting PM2..."
  pm2 restart dvhub
  
  echo "→ Waiting 3 seconds for startup..."
  sleep 3
  
  pm2 status dvhub
  
  echo ""
  echo "→ Testing localhost:8787..."
  curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8787/ || echo "Connection failed"
  echo ""
  curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8787/api/dashboard || echo "Connection failed"
  echo ""
REMOTE
