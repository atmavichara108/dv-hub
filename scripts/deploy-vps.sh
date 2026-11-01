#!/usr/bin/env bash
# scripts/deploy-vps.sh
# Deploy DV Hub to VPS (re-search.wiki). Провайдер-независимо:
# хост/порт/ключ берутся из scripts/vps-env.sh (ADR-010: переезд
# Fornex → Zomro, 2026-11-01). Run from project root: bash scripts/deploy-vps.sh
#
# Prerequisites:
#   - SSH key configured for dv@re-search.wiki (port from vps-env.sh)
#   - npm run build completed successfully

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/vps-env.sh"
VPS_HOST="${VPS_HOST}"
VPS_USER="${VPS_USER}"
VPS_PORT="${VPS_PORT}"
SSH_KEY="${SSH_KEY}"
REMOTE_DIR="${REMOTE_DIR}"

echo "=== DV Hub Deploy → VPS ==="

# Step 1: Build locally
echo "→ Building..."
npm run build

# Step 2: Sync dist/ and public/ to VPS
echo "→ Syncing dist/ ..."
rsync -avz --delete \
  -e "ssh -i ${SSH_KEY} -p ${VPS_PORT}" \
  dist/ "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/dist/"

echo "→ Syncing public/ ..."
rsync -avz --delete \
  -e "ssh -i ${SSH_KEY} -p ${VPS_PORT}" \
  public/ "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/public/"

# Step 3: Sync package files, migrations, scripts, and PM2 config
echo "→ Syncing package files..."
rsync -avz \
  -e "ssh -i ${SSH_KEY} -p ${VPS_PORT}" \
  package.json package-lock.json \
  "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

echo "→ Syncing migrations/ ..."
rsync -avz --delete \
  -e "ssh -i ${SSH_KEY} -p ${VPS_PORT}" \
  migrations/ "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/migrations/"

echo "→ Syncing scripts/ ..."
rsync -avz --delete \
  -e "ssh -i ${SSH_KEY} -p ${VPS_PORT}" \
  scripts/ "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/scripts/"

echo "→ Syncing ecosystem.config.cjs..."
rsync -avz \
  -e "ssh -i ${SSH_KEY} -p ${VPS_PORT}" \
  ecosystem.config.cjs \
  "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

# Step 4: Remote — install production deps, init DB, and restart
# IMPORTANT: load nvm so npm ci compiles native modules (better-sqlite3) for the correct Node version
echo "→ Installing deps & restarting on VPS..."
ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  echo "Node version: $(node --version)"
  cd /opt/dv-hub
  npm ci --omit=dev
  node scripts/init-db.js
  pm2 restart dvhub || pm2 start ecosystem.config.cjs
  pm2 save
  echo "→ Done. Checking status..."
  pm2 status dvhub
REMOTE

echo "=== Deploy complete ==="
