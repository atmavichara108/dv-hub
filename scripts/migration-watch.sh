#!/usr/bin/env bash
# 48-часовое наблюдение за ДВ-Хаб после переезда на Zomro (DV-030).
# Пишет строку каждые 30 мин: три домена + коды ответа.
# Лог: data/migration-watch.log. Сеть: прямой выход (--noproxy), цель — свой хост.
LOG=/home/rudra/Projects/dv-hub/data/migration-watch.log
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
IP=188.137.182.91

check() {
  local host="$1"
  local code
  code="$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' -m 20 \
    --resolve "${host}:443:${IP}" "https://${host}/" 2>/dev/null)"
  echo "${host}=${code:-err}"
}

echo "${STAMP} $(check re-search.wiki) $(check www.re-search.wiki) $(check meet.re-search.wiki)" >>"$LOG"
