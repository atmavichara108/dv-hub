---
type: Execution Spec
title: dv-hub dev-loop upgrade — итоги и состоявшийся факт
project: dv-hub
status: applied
timestamp: 2026-09-15
---

# dv-hub dev-loop upgrade (2026-09-15) — applied

> Фиксирует **что уже сделано и почему**, чтобы следующая dv-hub-сессия (в т.ч. из
> Pip-Boy) не переоткрывала вопросы и не ломала состоявшиеся решения. Это не план —
> это свершившийся факт на момент `HEAD` dv-hub перед фиксацией.

## Состоявшийся факт

### Процесс разработки
- `npm run dev` — tsx watch → `http://localhost:8787` (Node.js).
- `npm run ci` — гейт перед PR/деплоем: `lint` (=eslint `.ts,.tsx`) + `typecheck`
  (`tsc --noEmit`) + `test` (`jest`) + `build` (`vite`). Vite build **не** проверяет
  типы, поэтому `typecheck` добавлен в гейт отдельным шагом — не выкидывать.
- `npm run format` / `format:check` — Prettier по `src/**/*.{ts,tsx}`,
  `scripts/**/*.js`, `tests/**/*.ts`. `.prettierrc` (singleQuote off, trailingComma all).
- `.nvmrc` = `22` (согласовано с Docker и CI).
- CI: `.github/workflows/ci.yml` — `npm ci` → lint → typecheck → test → build, Node 22,
  `submodules: recursive`.

### Docker (только локальный dev)
- `Dockerfile` (`node:22-slim`), `docker-compose.yml` (порт `8787`, named volume
  `dv-hub-data`, `env_file: .env` optional), `.dockerignore`.
- Контейнер сам применяет миграции при старте (`node scripts/init-db.js && npm run dev`).
- Прод остаётся без Docker (ADR-001 не пересмотрен).

### Миграции и seed
- `scripts/init-db.js` переписан на идемпотентность: таблица `schema_migrations`,
  baseline для существующих БД, seed — только на свежей БД.
- **Критичный нюанс (не откатывать):** миграции идут с `PRAGMA foreign_keys=OFF` +
  `PRAGMA legacy_alter_table=ON`. Иначе 0006 (`ALTER TABLE users RENAME TO users_old`)
  переписывает FK дочерних таблиц на `users_old` и оставляет их висячими. После
  цикла — `PRAGMA foreign_keys=ON`.
- `scripts/seed.js` и `npm run db:seed` удалены (дублировали `seed.sql`).

### Тесты
- Jest в ESM-режиме (`jest.config.js`: ts-jest `useESM`, `extensionsToTreatAsEsm`).
- `tests/api.test.ts` — 6 интеграционных тестов через `createApp(env)`; Hono-биндинги
  передаются **третьим аргументом** `app.request(path, init, env)`, не инжертятся сами.
- `npm test` использует `--passWithNoTests`, чтобы пустой набор не ронял гейт.

### Чистка Cloudflare-хвостов
- Удалены: `wrangler.jsonc`, `wrangler.example.toml` (git), `scripts/seed.js`,
  `dev:cf`/`deploy:cf` из `package.json`.

## Что НЕ решено (см. соседние spec'и, не здесь)
- Восстановление живых данных Cloudflare-эпохи → `docs/specs/data-recovery.md`.
- Каталог canonical specs (`docs/specs/`) создан 2026-09-15, перенесён из Vault
  2026-09-16 → `docs/specs/pipboy-synergy.md`.

## Ограничения выполнения
- Docker-сборка **не верифицирована** (команды `docker*` были запрещены в сессии,
  где происходил апгрейд); первый прогон `docker compose up --build` — отдельная
  задача со своим гейтом.