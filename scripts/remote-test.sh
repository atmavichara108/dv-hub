#!/usr/bin/env bash
# scripts/remote-test.sh
# Test various endpoints on VPS
set -euo pipefail

VPS_USER="dv"
VPS_HOST="re-search.wiki"
VPS_PORT="28108"
SSH_KEY="${HOME}/.ssh/id_ed25519"

ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  
  echo "=== Test /api/dashboard ==="
  curl -s http://localhost:8787/api/dashboard | head -c 200
  echo ""
  
  echo ""
  echo "=== Test /api/materials ==="
  curl -s http://localhost:8787/api/materials | head -c 200
  echo ""
  
  echo ""
  echo "=== Test / (root) ==="
  curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8787/
  echo ""
  
  echo ""
  echo "=== PM2 logs (last 5 lines) ==="
  pm2 logs dvhub --lines 5 --nostream
REMOTE
