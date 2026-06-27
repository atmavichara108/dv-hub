#!/bin/bash
# DV Hub backup script — запускается cron'ом на VPS
# Перед запуском: установить Tailscale, настроить SSH-ключи
# Заменить TAILSCALE_IP на реальный IP в .env или здесь

set -euo pipefail

BACKUP_DIR="/opt/dv-hub/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="/opt/dv-hub/backups/backup.log"

# Читаем конфиг из .env если есть
TAILSCALE_IP="${TAILSCALE_IP:-}"
REMOTE_USER="${REMOTE_USER:-rudra}"
REMOTE_PATH="${REMOTE_PATH:-/mnt/backups/dv-hub/}"
LOCAL_RETENTION="${LOCAL_RETENTION:-4}"  # сколько копий хранить локально

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Backup started ==="

# 1. SQLite dump
log "Dumping database..."
sqlite3 /opt/dv-hub/data/dv-hub.db ".dump" | gzip > "$BACKUP_DIR/dv-hub-db-$TIMESTAMP.sql.gz"
log "  → $(du -h "$BACKUP_DIR/dv-hub-db-$TIMESTAMP.sql.gz" | cut -f1)"

# 2. Env files
log "Backing up .env files..."
tar czf "$BACKUP_DIR/dv-hub-env-$TIMESTAMP.tar.gz" -C /opt/dv-hub .env 2>/dev/null || log "  ⚠ no .env in dv-hub"
if [ -f /opt/mirotalksfu/.env ]; then
  tar czf "$BACKUP_DIR/mirotalk-env-$TIMESTAMP.tar.gz" -C /opt/mirotalksfu .env
fi

# 3. Nginx configs
log "Backing up Nginx configs..."
tar czf "$BACKUP_DIR/nginx-conf-$TIMESTAMP.tar.gz" -C /etc/nginx/sites-available .

# 4. All files in one archive for easy transfer
log "Creating combined archive..."
tar czf "$BACKUP_DIR/dv-hub-full-$TIMESTAMP.tar.gz" \
  -C "$BACKUP_DIR" "dv-hub-db-$TIMESTAMP.sql.gz" \
  2>/dev/null

# 5. Send to remote via Tailscale (if configured)
if [ -n "$TAILSCALE_IP" ]; then
  log "Sending to remote ($TAILSCALE_IP)..."
  if rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new" \
    "$BACKUP_DIR/dv-hub-full-$TIMESTAMP.tar.gz" \
    "${REMOTE_USER}@${TAILSCALE_IP}:${REMOTE_PATH}" 2>> "$LOG_FILE"; then
    log "  ✅ Remote copy successful"
  else
    log "  ⚠ Remote copy failed (remote offline?): $?"
  fi
else
  log "  ⏭ TAILSCALE_IP not set — skipping remote copy"
fi

# 6. Cleanup local old backups (keep last N)
log "Cleaning old local backups..."
ls -t "$BACKUP_DIR"/dv-hub-full-*.tar.gz 2>/dev/null | tail -n +$((LOCAL_RETENTION + 1)) | while read f; do
  rm -f "$f"
  log "  removed $f"
done

# Also clean individual parts older than retention
ls -t "$BACKUP_DIR"/dv-hub-db-*.sql.gz 2>/dev/null | tail -n +$((LOCAL_RETENTION + 1)) | while read f; do
  rm -f "$f"
done
ls -t "$BACKUP_DIR"/dv-hub-env-*.tar.gz 2>/dev/null | tail -n +$((LOCAL_RETENTION + 1)) | while read f; do
  rm -f "$f"
done
ls -t "$BACKUP_DIR"/mirotalk-env-*.tar.gz 2>/dev/null | tail -n +$((LOCAL_RETENTION + 1)) | while read f; do
  rm -f "$f"
done
ls -t "$BACKUP_DIR"/nginx-conf-*.tar.gz 2>/dev/null | tail -n +$((LOCAL_RETENTION + 1)) | while read f; do
  rm -f "$f"
done

log "=== Backup completed ==="
