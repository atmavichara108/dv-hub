#!/usr/bin/env bash
# scripts/deploy-coturn.sh
# Установка и настройка coturn (TURN/STUN) для MiroTalk SFU.
# Задача DV-012 (ADR-007: включать ПО ФАКТУ жалоб на связь, не упреждающе).
# Хост/ключ — scripts/vps-env.sh (провайдер-независимо).
#
# Запуск: bash scripts/deploy-coturn.sh [--host <VPS_HOST>]
# На сервере выполняется под sudo (dv в группе sudo; при запросе пароля —
# запускать скрипт НА сервере: scp scripts/deploy-coturn.sh dv@host:/tmp/ &&
# ssh dv@host sudo bash /tmp/deploy-coturn.sh)

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/vps-env.sh"

echo "=== coturn (TURN/STUN) → ${VPS_USER}@${VPS_HOST}:${VPS_PORT} ==="

ssh_remote bash -s <<'REMOTE'
set -euo pipefail

echo "→ Устанавливаю coturn..."
sudo apt-get update -qq
sudo apt-get install -y coturn

CONF=/etc/turnserver.conf
SECRET_FILE=/etc/turnserver.secret

# Секрет генерируется на сервере, в репозиторий НЕ попадает (секретов в репо нет).
if [ ! -f "$SECRET_FILE" ]; then
  openssl rand -hex 32 | sudo tee "$SECRET_FILE" >/dev/null
  sudo chmod 600 "$SECRET_FILE"
  echo "✓ секрет сгенерирован: $SECRET_FILE (в репо не идёт)"
else
  echo "• секрет уже есть: $SECRET_FILE"
fi
SECRET="$(sudo cat "$SECRET_FILE")"

sudo mkdir -p /var/log/turnserver /var/lib/turnserver
sudo chown -R turnserver:turnserver /var/log/turnserver /var/lib/turnserver 2>/dev/null || true

echo "→ Пишу $CONF ..."
sudo tee "$CONF" >/dev/null <<EOF
# DV Hub / MiroTalk SFU TURN (DV-012)
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=$(curl -s -4 ifconfig.me || echo 0.0.0.0)
external-ip=$(curl -s -4 ifconfig.me || echo 0.0.0.0)
min-port=40000
max-port=40100
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=${SECRET}
realm=dv-hub.re-search.wiki
no-multicast-peers
no-cli
verbose
EOF

echo "→ enable + restart..."
sudo systemctl enable coturn
sudo systemctl restart coturn
sleep 2
systemctl is-active coturn || { echo "⚠ coturn не активен — смотри journalctl -u coturn"; exit 1; }

echo "=== coturn поднят ==="
IP="$(curl -s -4 ifconfig.me || echo <IP-СЕРВЕРА>)"
echo "TURN_URL: turn:${IP}:3478?transport=udp"
echo "TURN_URL (tcp): turn:${IP}:3478?transport=tcp"
echo "TURN_USERNAME: любое (напр. dvhub) — при lt-cred-mech пароль = хеш, НЕ static-auth-secret"
echo "Для MiroTalk нужен ОДНОРАЗОВЫЙ пароль: base64(HMAC-SHA1(username, secret)) —"
echo "см. docs/infra-runbook.md раздел DV-012 (команда генерации)."
REMOTE

echo ""
echo "=== Firewall ==="
ssh_remote "sudo ufw allow 3478/tcp comment 'TURN' && sudo ufw allow 3478/udp comment 'TURN' && sudo ufw allow 5349/tcp comment 'TURN TLS' && sudo ufw reload && sudo ufw status | grep -E '3478|5349'"

echo ""
echo "=== Готово ==="
echo "Дальше — вписать TURN_URL/USERNAME/CREDENTIAL в /opt/mirotalksfu/.env (runbook DV-012)"
echo "и pm2 restart mirotalksfu."
