#!/usr/bin/env bash
# scripts/remote-debug.sh
# Debug: try to start server manually on VPS to see errors
set -euo pipefail

VPS_USER="dv"
VPS_HOST="re-search.wiki"
VPS_PORT="28108"
SSH_KEY="${HOME}/.ssh/id_ed25519"

ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  
  cd /opt/dv-hub
  
  echo "=== Node version ==="
  node --version
  
  echo ""
  echo "=== Check dist/server.js exists ==="
  ls -la dist/server.js
  
  echo ""
  echo "=== Check node_modules exists ==="
  ls node_modules/ | head -10
  
  echo ""
  echo "=== Try to run server directly (5 second timeout) ==="
  timeout 5 node dist/server.js 2>&1 || true
  
  echo ""
  echo "=== Check .env exists ==="
  ls -la .env 2>/dev/null || echo "No .env file"
  
  echo ""
  echo "=== PM2 error log (last 20 lines) ==="
  tail -20 ~/.pm2/logs/dvhub-error.log 2>/dev/null || echo "No error log"
  
  echo ""
  echo "=== PM2 out log (last 10 lines) ==="
  tail -10 ~/.pm2/logs/dvhub-out.log 2>/dev/null || echo "No out log"
REMOTE
