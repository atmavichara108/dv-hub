#!/usr/bin/env bash
# scripts/remote-restart.sh
# Restart PM2 on VPS with nvm loaded (non-interactive SSH doesn't source .bashrc)
set -euo pipefail

# Конфиг — scripts/vps-env.sh (ADR-010: переезд Fornex → Zomro).
source "$(dirname "${BASH_SOURCE[0]}")/vps-env.sh"

ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  
  echo "Node version: $(node --version)"
  echo "PM2 path: $(which pm2)"
  
  cd /opt/dv-hub
  pm2 restart dvhub || pm2 start ecosystem.config.cjs
  pm2 save
  pm2 status dvhub
REMOTE
