#!/usr/bin/env bash
# scripts/vps-env.sh
# Единая точка конфигурации деплоя DV Hub.
# Source из деплой-скриптов: source "$(dirname "$0")/vps-env.sh"
#
# ПереездFornex → Zomro (ADR-010, 2026-11-01): значения по умолчанию
# указывают на ТЕКУЩИЙ сервер (Fornex), чтобы скрипты работали до
# переключения. После переезда — сменить значения здесь (или задать
# одноимёнными env-переменными снаружи, env имеет приоритет).
#
# Env-переменные (имеют приоритет над значениями ниже):
#   VPS_USER, VPS_HOST, VPS_PORT, SSH_KEY, REMOTE_DIR,
#   MIROTALK_DIR, SFU_ANNOUNCED_IP

: "${VPS_USER:=dv}"
: "${VPS_HOST:=re-search.wiki}"
: "${VPS_PORT:=28108}"
: "${SSH_KEY:=$HOME/.ssh/id_ed25519}"
: "${REMOTE_DIR:=/opt/dv-hub}"
: "${MIROTALK_DIR:=/opt/mirotalksfu}"

# Публичный IP сервера для MediaSoup (SFU_ANNOUNCED_IP в .env MiroTalk).
# Zomro NL-3 (факт заказа 2026-11-05, вердикт владельца): 188.137.182.91.
# До переключения дефолты остаются на текущем Fornex; на новом сервере
# деплой идёт с env: VPS_HOST=188.137.182.91 SFU_ANNOUNCED_IP=188.137.182.91
: "${SFU_ANNOUNCED_IP:=89.127.198.185}"

export VPS_USER VPS_HOST VPS_PORT SSH_KEY REMOTE_DIR MIROTALK_DIR SFU_ANNOUNCED_IP

# SSH-хелпер: единая строка подключения для всех скриптов.
# Использование: ssh_remote 'bash -s' <<'REMOTE' ... REMOTE
ssh_remote() {
  ssh -i "${SSH_KEY}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" "$@"
}
