#!/usr/bin/env bash
# CI-сторож ДВ-Хаб: следит за GitHub Actions в dv-hub и dv-project.
# Новое упавшее действие → строка в data/gh-watch.log + issue в самом репозитории.
# Дедупликация по run id в data/gh-watch.state.
# Запуск: cron */15.
set -u

LOG=/home/rudra/Projects/dv-hub/data/gh-watch.log
STATE=/home/rudra/Projects/dv-hub/data/gh-watch.state
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

REPOS="atmavichara108/dv-hub atmavichara108/dv-project"

touch "$STATE" "$LOG"

for repo in $REPOS; do
  runs="$(gh run list --repo "$repo" --limit 6 \
    --json databaseId,workflowName,conclusion,status,headSha,createdAt 2>/dev/null || true)"
  [ -n "$runs" ] || continue
  echo "$runs" | python3 -c '
import json, sys
try:
    runs = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for r in runs:
    if r.get("status") != "completed":
        continue
    print("\t".join([
        str(r.get("databaseId", "")),
        r.get("workflowName", "") or "",
        r.get("conclusion", "") or "",
        (r.get("headSha") or "")[:8],
        r.get("createdAt", "") or "",
    ]))
' | while IFS=$'\t' read -r id wf conclusion sha created; do
    [ "$conclusion" = "failure" ] || continue
    grep -q "^${id}$" "$STATE" && continue
    echo "${id}" >>"$STATE"
    echo "${STAMP} FAIL ${repo} ${wf} run=${id} sha=${sha} at=${created}" >>"$LOG"
    # Двойная защита от дублей: состояние стёрто — титул ищется среди открытых issue.
    existing="$(gh issue list --repo "$repo" --state open --search "run ${id} in:title" --limit 1 \
      --json number --jq '.[0].number' 2>/dev/null || true)"
    if [ -n "$existing" ]; then
      echo "${STAMP} SKIP-DUP ${repo} run=${id} issue=#${existing}" >>"$LOG"
      continue
    fi
    tail="$(gh run view "$id" --repo "$repo" --log-failed 2>/dev/null | tail -25)"
    title="[CI-watch] ${repo}: ${wf} упал (run ${id})"
    body="Автоматический сторож CI ДВ-Хаб зафиксировал новое падение.

- Репозиторий: ${repo}
- Действие: ${wf}
- Run: https://github.com/${repo}/actions/runs/${id}
- Коммит: ${sha}
- Время: ${created}

Последние строки упавшего шага:

\`\`\`
${tail}
\`\`\`

Разбор — линия Отдела разработки ДВ-Хаб (Master-Enginer)."
    gh issue create --repo "$repo" --title "$title" --body "$body" >/dev/null 2>&1 \
      && echo "${STAMP} ISSUE ${repo} run=${id}" >>"$LOG" \
      || echo "${STAMP} ISSUE-FAILED ${repo} run=${id}" >>"$LOG"
  done
done
