#!/usr/bin/env bash
# scripts/remote-logs.sh
# Check PM2 logs on VPS
set -euo pipefail

VPS_USER="dv"
VPS_HOST="re-search.wiki"
VPS_PORT="28108"
SSH_KEY="${HOME}/.ssh/id_ed25519"

ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  
  echo "=== PM2 Status ==="
  pm2 status
  
  echo ""
  echo "=== PM2 Logs (last 30 lines) ==="
  pm2 logs dvhub --lines 30 --nostream
  
  echo ""
  echo "=== Curl localhost:8787 ==="
  curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8787/ || echo "Connection failed"
  echo ""
  curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8787/api/dashboard || echo "Connection failed"
  echo ""
REMOTE
