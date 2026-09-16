---
type: Index
title: dv-hub — canonical execution specs
project: dv-hub
repo: /home/rudra/Projects/dv-hub
status: active
timestamp: 2026-09-15
---

# dv-hub — canonical execution specs

> Canonical source of truth для execution-решений по проекту dv-hub, **локально
> в этом репозитории** (`docs/specs/`). Локальный `/spec` резолвит спеки отсюда.
> Правило владения (Vault `06-Specs/README`): execution spec живёт в репозитории
> агента, который его исполняет — dv-hub-спеки исполняет dv-hub-агент, поэтому
> они здесь, а не в Vault.

## Фактический baseline (зафиксировано 2026-09-15)

- **Стек**: Hono + TS strict · Node.js · better-sqlite3 · Vanilla JS + Tailwind · Vite · npm.
  Миграция с Cloudflare завершена по коду (DV-008); Cloudflare-хвосты вычищены.
- **Dev-порт**: `8787` (`package.json` → `dev` = `tsx watch src/server.ts`).
  Старый `localhost:3000` — устаревшая ссылка из Cloudflare-эпохи.
- **Прод**: PM2 + Nginx на Fornex VPS **без Docker** (ADR-001). Docker — только локальный dev.
- **Миграции**: `scripts/init-db.js` — идемпотентно (таблица `schema_migrations`, baseline
  для старых БД, `PRAGMA foreign_keys=OFF` + `legacy_alter_table=ON` из-за 0006). ADR-009.
- **Seed**: единственный путь — `seed.sql` внутри `init-db.js` на свежей БД.
  `scripts/seed.js` / `db:seed` удалены как дублирующие заглушки.
- **CI/гейт**: `npm run ci` = `eslint(.ts,.tsx)` + `tsc --noEmit` + `jest` + `vite build`.
  GitHub Actions — `.github/workflows/ci.yml` (Node 22). Jest в ESM-режиме, 6 интеграционных
  тестов API в `tests/api.test.ts`.

## Specs в этом каталоге

| Файл | Что фиксирует |
|------|---------------|
| [dev-loop-upgrade-2026-09.md](dev-loop-upgrade-2026-09.md) | Что сделано и почему (итоги апгрейда dev-цикла) |
| [data-recovery.md](data-recovery.md) | Открытый критичный вопрос: восстановление живых данных Cloudflare-эпохи |
| [audit-drift-backlog.md](audit-drift-backlog.md) | Открытые findings аудита Phase D (что снято, что осталось) |
| [pipboy-synergy.md](pipboy-synergy.md) | Контракт совместной разработки dv-hub через Pip-Boy |

## Границы каталога

- Код и изменения — в `/home/rudra/Projects/dv-hub`.
- Канонические спеки и стратегия — здесь (`docs/specs/`).
- Kanban-карточка экосистемы — `tools/ecosystem-map/registry.json` в Vault (ECO-022),
  ведётся Pip-Boy-сессией, не этим каталогом.