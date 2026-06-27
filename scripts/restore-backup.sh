#!/bin/bash
# DV Hub restore script — запускать руками при необходимости
set -euo pipefail

echo "=== DV Hub Restore ==="
echo "This script will restore from a local backup file."
echo "Usage: $0 <path-to-dv-hub-full-*.tar.gz>"

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: provide a valid backup file path"
  exit 1
fi

RESTORE_DIR=$(mktemp -d)
tar xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

# Restore database
if ls "$RESTORE_DIR"/dv-hub-db-*.sql.gz 1>/dev/null 2>&1; then
  echo "Restoring database..."
  gunzip -c "$RESTORE_DIR"/dv-hub-db-*.sql.gz > "$RESTORE_DIR/restore.sql"
  # Backup current DB just in case
  cp /opt/dv-hub/data/dv-hub.db /opt/dv-hub/data/dv-hub.db.restore-bak
  sqlite3 /opt/dv-hub/data/dv-hub.db < "$RESTORE_DIR/restore.sql"
  echo "  ✅ Database restored (backup saved as dv-hub.db.restore-bak)"
fi

echo "Restore complete. Run 'pm2 restart dvhub' to apply."
