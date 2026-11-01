#!/usr/bin/env bash
# scripts/remote-curl-public.sh
# Test public URL from the server itself
set -euo pipefail

# Конфиг — scripts/vps-env.sh (ADR-010: переезд Fornex → Zomro).
source "$(dirname "${BASH_SOURCE[0]}")/vps-env.sh"

ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
  echo "=== Test localhost:8787/api/dashboard ==="
  curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8787/api/dashboard
  
  echo ""
  echo "=== Test https://re-search.wiki/api/dashboard (via Nginx) ==="
  curl -s -o /dev/null -w "HTTP %{http_code}\n" https://re-search.wiki/api/dashboard
  
  echo ""
  echo "=== Response body from localhost ==="
  curl -s http://localhost:8787/api/dashboard | head -c 200
  echo ""
  
  echo ""
  echo "=== Response body from public URL ==="
  curl -s https://re-search.wiki/api/dashboard | head -c 200
  echo ""
REMOTE
