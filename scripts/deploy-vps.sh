#!/usr/bin/env bash
# scripts/deploy-vps.sh
# Deploy DV Hub to Fornex VPS (re-search.wiki).
# Run from project root: bash scripts/deploy-vps.sh
#
# Prerequisites:
#   - SSH key configured for dv@re-search.wiki (port 20108)
#   - npm run build completed successfully

set -euo pipefail

VPS_USER="dv"
VPS_HOST="re-search.wiki"
VPS_PORT="20108"
REMOTE_DIR="/opt/dv-hub"

echo "=== DV Hub Deploy → VPS ==="

# Step 1: Build locally
echo "→ Building..."
npm run build

# Step 2: Sync dist/ and public/ to VPS
echo "→ Syncing dist/ ..."
rsync -avz --delete \
  -e "ssh -p ${VPS_PORT}" \
  dist/ "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/dist/"

echo "→ Syncing public/ ..."
rsync -avz --delete \
  -e "ssh -p ${VPS_PORT}" \
  public/ "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/public/"

# Step 3: Sync package.json and package-lock.json for npm ci
echo "→ Syncing package files..."
rsync -avz \
  -e "ssh -p ${VPS_PORT}" \
  package.json package-lock.json \
  "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

# Step 4: Remote — install production deps and restart
echo "→ Installing deps & restarting on VPS..."
ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  cd /opt/dv-hub
  npm ci --omit=dev
  pm2 restart dvhub || pm2 start ecosystem.config.cjs
  pm2 save
  echo "→ Done. Checking status..."
  pm2 status dvhub
REMOTE

echo "=== Deploy complete ==="
