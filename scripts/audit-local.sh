#!/usr/bin/env bash
set +e
REPORT="docs/audit/audit-$(date +%Y-%m-%d).md"
mkdir -p docs/audit
{
  echo "# Аудит DV Hub — $(date -Iseconds)"
  echo
  echo "## Git состояние"
  echo '```'
  echo "Ветка: $(git branch --show-current)"
  echo "Последний коммит: $(git log -1 --oneline)"
  echo "Дней с последнего коммита: $(( ( $(date +%s) - $(git log -1 --format=%ct) ) / 86400 ))"
  git status --short
  echo '```'
  echo
  echo "## Submodule context/"
  echo '```'
  git submodule status
  echo '```'
  echo
  echo "## Зависимости"
  echo '```'
  npm outdated 2>&1 | head -30
  echo "---"
  npm audit --production 2>&1 | tail -15
  echo '```'
  echo
  echo "## Линт и типы"
  echo '```'
  npm run lint 2>&1 | tail -20
  echo "---"
  npx tsc --noEmit 2>&1 | tail -20
  echo '```'
  echo
  echo "## Тесты"
  echo '```'
  npm test 2>&1 | tail -30
  echo '```'
  echo
  echo "## Миграции БД"
  echo '```'
  ls -1 migrations/ 2>&1
  echo "---"
  echo "Последняя миграция: $(ls migrations/ | sort | tail -1)"
  echo '```'
  echo
  echo "## Kanban статус"
  echo '```'
  echo "Задач в Todo:  $(ls context/DV/Operations/Kanban/Tasks/ 2>/dev/null | wc -l)"
  find context/DV/Operations/Kanban -type d 2>/dev/null
  echo '```'
  echo
  echo "## Актуальность документации"
  echo '```'
  for f in docs/product-vision.md docs/architecture.md docs/roadmap.md docs/infra-runbook.md; do
    if [ -f "$f" ]; then
      days=$(( ( $(date +%s) - $(git log -1 --format=%ct "$f") ) / 86400 ))
      echo "$f — $days дней назад"
    else
      echo "$f — ОТСУТСТВУЕТ"
    fi
  done
  echo '```'
  echo
  echo "## Env шаблон vs фактический"
  echo '```'
  if [ -f .env.example ] && [ -f .env ]; then
    echo "Переменные в .env.example, отсутствующие в .env:"
    comm -23 <(grep -E "^[A-Z_]+=" .env.example | cut -d= -f1 | sort) <(grep -E "^[A-Z_]+=" .env | cut -d= -f1 | sort)
  else
    [ ! -f .env ] && echo ".env отсутствует"
    [ ! -f .env.example ] && echo ".env.example отсутствует"
  fi
  echo '```'
  echo
  echo "## Секреты в коде (быстрая проверка)"
  echo '```'
  grep -rE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9]{20,})" \
    --include="*.ts" --include="*.js" --include="*.json" \
    src/ public/ migrations/ 2>/dev/null | head -5
  echo "(пусто = утечек не найдено)"
  echo '```'
  echo
  echo "## Размеры и структура"
  echo '```'
  echo "src/ — $(find src/ -type f | wc -l) файлов, $(du -sh src/ | cut -f1)"
  echo "public/ — $(find public/ -type f | wc -l) файлов, $(du -sh public/ | cut -f1)"
  du -sh node_modules/ 2>/dev/null
  echo '```'
} > "$REPORT"
echo "Отчёт: $REPORT"
