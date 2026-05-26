#!/usr/bin/env bash
# sync-task.sh — фиксирует изменения в submodule context и поднимает указатель в dv-hub
# Usage: ./scripts/sync-task.sh "task(DV-008): update spec"
# Или без аргумента — возьмёт автоматически "chore(context): sync $(date +%Y-%m-%d-%H%M)"

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTEXT_DIR="$REPO_ROOT/context"

cd "$REPO_ROOT"

# ── 1. Sanity checks ──────────────────────────────────────────────
if [ ! -d "$CONTEXT_DIR/.git" ] && [ ! -f "$CONTEXT_DIR/.git" ]; then
  echo "❌ context/ не submodule или не инициализирован"
  exit 1
fi

# ── 2. Submodule на ветке main? ───────────────────────────────────
cd "$CONTEXT_DIR"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  submodule на ветке '$CURRENT_BRANCH', переключаю на main"
  git checkout main
fi

# ── 3. Что изменилось в submodule ─────────────────────────────────
if git diff --quiet && git diff --cached --quiet; then
  echo "ℹ️  В submodule context нет изменений — пропускаю коммит"
  HAS_SUBMODULE_CHANGES=0
else
  HAS_SUBMODULE_CHANGES=1
  echo "📝 Изменения в submodule:"
  git status --short
  echo ""

  COMMIT_MSG="${1:-chore(context): sync $(date +%Y-%m-%d-%H%M)}"

  read -p "Закоммитить и запушить с сообщением: \"$COMMIT_MSG\" ? [y/N] " ANSWER
  if [[ "$ANSWER" != "y" && "$ANSWER" != "Y" ]]; then
    echo "❌ Отменено пользователем"
    exit 0
  fi

  git add -A
  git commit -m "$COMMIT_MSG"
  git push origin main
  echo "✅ submodule запушен"
fi

# ── 4. Bump указателя в dv-hub ────────────────────────────────────
cd "$REPO_ROOT"

if git diff --quiet HEAD -- context; then
  if [ "$HAS_SUBMODULE_CHANGES" -eq 0 ]; then
    echo "ℹ️  dv-hub уже на актуальном SHA submodule — нечего делать"
    exit 0
  fi
fi

# Возможно submodule изменился извне (Obsidian запушил) — подтянем pointer
git submodule update --remote --no-fetch context 2>/dev/null || true

if git diff --quiet HEAD -- context; then
  echo "ℹ️  Указатель submodule не изменился"
  exit 0
fi

echo "📌 Обновляю указатель submodule в dv-hub:"
git diff context

git add context
BUMP_MSG="chore: bump context"
if [ -n "$1" ]; then
  BUMP_MSG="chore: bump context for ${1}"
fi
git commit -m "$BUMP_MSG"
git push
echo "✅ dv-hub запушен с новым указателем"
