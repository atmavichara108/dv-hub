# DV Hub — Decisions Log

> Append-only лог значимых решений (flush-протокол, см. OpenCode-Vault method `memory-management`).
> Перед записью читать верх файла, не дублировать. Коммит — отдельной логической единицей.

## 2026-09-15 — dev-loop upgrade (завершённая сессия)

### Состоявшийся факт (запушено в `origin/main`, HEAD `c443ae9`)

- **Dev-порт 8787**, не 3000. `npm run dev` = `tsx watch src/server.ts` → `http://localhost:8787`.
  Старые ссылки localhost:3000 и `dev:sandbox` — Cloudflare-эпоха, удалены из README.
- **Прод без Docker** (ADR-001 не пересмотрен). Docker только локальный dev:
  `Dockerfile` (node:22-slim) + `docker-compose.yml` (port 8787, named volume `dv-hub-data`,
  optional `env_file: .env`). Контейнер сам гонит `node scripts/init-db.js && npm run dev`.
- **CI-гейт**: `npm run ci` = `eslint(.ts,.tsx)` + `tsc --noEmit` + `jest` + `vite build`.
  `.github/workflows/ci.yml` (Node 22, `submodules: recursive`). Vite build НЕ проверяет типы —
  поэтому typecheck отдельным шагом, не выкидывать.
- **Jest в ESM-режиме** (`jest.config.js`: ts-jest `useESM`, tsx в moduleFileExtensions).
  `tests/api.test.ts` — первоначально 6 интеграционных тестов через `createApp(env)`;
  Hono-биндинги — **третий аргумент** `app.request(path, init, env)`.
- `.nvmrc` = `22`. Prettier: `.prettierrc` (trailingComma all), формат по `src/scripts/tests`.

### Миграции и seed (ADR-009)

- `scripts/init-db.js` идемпотентен: таблица `schema_migrations`, baseline для старых БД,
  seed.sql только на свежей БД.
- **Критично, не откатывать:** миграции идут с `PRAGMA foreign_keys=OFF` +
  `PRAGMA legacy_alter_table=ON`. Иначе 0006 (`ALTER TABLE users RENAME TO users_old`)
  оставляет FK дочерних таблиц висячими на `users_old`. После цикла `foreign_keys=ON`.
- `scripts/seed.js` и `db:seed` удалены (дублировали seed.sql).

### Чистка Cloudflare

- Удалены из git: `wrangler.jsonc`, `wrangler.example.toml`, `scripts/seed.js`,
  скрипты `dev:cf`/`deploy:cf`. С диска: `wrangler.toml`, `.wrangler/`.

### Агентский слой (правка пользователя, закоммичена c443ae9)

- `.opencode/commands/spec.md` = pointer-wrapper на canonical Vault
  `/home/rudra/Projects/OpenCode-Vault/06-Specs/dv-hub/`.
- `opencode.json` = edit/bash default allow + точечные deny (.env, rm -rf, sudo, push --force, ssh).

## Открытые вопросы (следующая сессия из Pip-Boy)

- **P1 BLOCKED — data recovery:** живые данные Cloudflare-эпохи НЕ в репозитории
  (везде только сид: 1 user + 3 темы/3 материала, пусть и с дублями). Искать в D1
  `dv-hub-production` → VPS `/opt/dv-hub/data/dv-hub.db` → cron-бэкапы `backup.sh`.
  Полный разбор: Vault `06-Specs/dv-hub/data-recovery.md`.
- **P2 — security candidate:** hono ≤ 4.12.26 GHSA HTML-injection (`G-D-RUN-4`),
  не подтверждён до bump+advisory. Остальное из audit-drift:
  Vault `06-Specs/dv-hub/audit-drift-backlog.md`.
- Docker-сборка **не верифицирована** (команды docker* были запрещены в сессии).
  Первый прогон `docker compose up --build` — отдельная задача со своим гейтом.

### Vault side

- Canonical specs dv-hub закоммичены в Vault (`1e47b44`), но пуш Vault **отложен**:
  ветка main расходится (26 локальных Pip-Boy-коммитов vs 2 чужих на remote, дубль
  «capture ECO-035»). Пушить будет активная Pip-Boy-сессия, мой коммит подтянется следом.
