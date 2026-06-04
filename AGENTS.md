
# DV Hub — Agent Instructions

> Универсальная инструкция для AI-агентов (opencode, Claude Code, Cursor, Aider). Это контракт между человеком и агентами о том, что мы строим и как.

## Project Overview

DV Hub — самохостимая исследовательская платформа движения «Дискуссионные Вечера». Сейчас находится в Phase 0: миграция с Cloudflare Pages на собственный VPS (домен re-search.wiki).

См. `docs/product-vision.md` для целей и anti-goals, `docs/architecture.md` для архитектурных решений (ADR).

## Stack

### Current (на момент написания)
- Runtime: Cloudflare Workers (Hono framework)
- Database: Cloudflare D1 (SQLite)
- Deploy: Cloudflare Pages

### Target (Phase 0 в работе)
- Runtime: Node.js + PM2
- Reverse proxy: Nginx
- Database: SQLite (better-sqlite3 или libSQL)
- Host: Fornex VPS, Ubuntu 24.04, Germany
- Domain: re-search.wiki
- Video: MiroTalk SFU на meet.re-search.wiki

### Constant
- Language: TypeScript strict mode
- Frontend: Vanilla JS (ES modules) + Tailwind CSS
- Build: Vite
- Package manager: npm
- Auth: Telegram Login Widget + email magic-link (Resend)

## Commands

- `npm run dev` — local dev server (Vite)
- `npm run build` — production build
- `npm run deploy` — alias to deploy:cf (текущий) → deploy:vps (после DV-008)
- `npm run db:migrate:local` — apply migrations locally
- `npm run db:seed` — seed database
- `npm run db:reset` — drop + migrate + seed
- `npm run lint` / `npm run test` / `npm run ci`
- `npm run context:sync` / `context:bump` / `context:status` — работа с submodule

См. `package.json` для полного списка.

## Project Structure

```
src/ index.tsx # Hono app, HTML shell, OG meta routes/api.ts # REST API endpoints lib/auth.ts # Telegram verify, magic-link, sessions
public/static/ app.js # Entry point, SPA router modules/*.js # Feature modules (auth, search, dashboard, materials, topics, rooms, media, admin, profile, faq, router, utils)
migrations/ 0001_initial_schema.sql
docs/ product-vision.md # Vision и anti-goals architecture.md # ADR glossary.md # Термины движения и платформы roadmap.md # Фазы infra-runbook.md # Операционный мануал (Phase 0+)
.opencode/ agents/ # plan, build, reviewer, researcher, infra commands/ # custom slash-commands plugins/ # env-guard, notify
context/ # git submodule на dv-project (vault движения)
```

## Database Tables

`cells`, `users`, `materials`, `topics`, `discussion_rooms`, `messages`, `publications`, `sessions`. См. `migrations/` для актуальной схемы.

## Auth

- Telegram Login Widget (primary) — основной путь для участников движения.
- Email magic-link через Resend (fallback).
- Sessions: HTTP-only cookie + sessions table.

### Roles (упрощённая модель, см. ADR-008)
- `admin` — конфигурация, модерация, доступ ко всему.
- `member` — авторизованный участник ячейки.
- `guest` — приглашённый эксперт на конкретную тему.

Старые роли (moderator, researcher, expert, public) — устарели, мигрируются в задаче DV-019.

## API Conventions

- Все endpoints с префиксом `/api/`.
- JSON request/response.
- Error format: `{ error: string, details?: unknown }`.
- Status: 400 для client errors, 401 для unauthorized, 403 для forbidden, 404 для not found, 500 для server errors.
- Auth через session cookie, проверка в middleware.

## Code Conventions

- TypeScript strict mode, без `any`. Используй `unknown` с type guards если тип неизвестен.
- Hono context типизирован для всех handlers.
- Frontend modules экспортируют `init()` функцию.
- Tailwind utility classes only, никакого custom CSS.
- SPA с hash routing, без SSR.
- SQL migrations: только sequential, новый файл `NNNN_*.sql`, **никогда не редактируй существующие миграции**.

## Important Notes

- D1 SQLite не поддерживает `RETURNING *` на INSERT — используй отдельный SELECT.
- Wrangler bindings (current): DB, TELEGRAM_BOT_TOKEN, RESEND_API_KEY.
- После DV-007 D1 заменится на локальный SQLite-файл, после DV-008 wrangler уйдёт совсем.
- Все frontend modules загружаются динамически через router.js.

## Communication

- Всегда отвечай на русском в диалогах с пользователем.
- Код, имена переменных, commit messages — на английском.
- Commit format: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `task(DV-XXX):` для задач.

## Workflow

1. Перед любым изменением — прочитай соответствующий ADR в `docs/architecture.md` или задачу в `context/DV/Operations/Kanban/Tasks/`.
2. Если нет ADR/задачи — стоп, обратись к @plan для оформления.
3. Маленькие коммиты, по одной логической единице на коммит.
4. После изменений — `npm run lint`, потом `npm run test` (если применимо).
5. Перед commit — `git diff` и краткое объяснение пользователю.

## Security

- НИКОГДА не читай и не пиши файлы: `.env*`, `auth.json`, `.ssh/`, `keys-passwords*`, `/etc/shadow`.
- НИКОГДА не используй `sudo` или `rm -rf`.
- Любые секреты (API keys, tokens) — только из env переменных, никогда в коде или commit.

## Submodule context/

`context/` — git submodule на dv-project. Параллельно открыт в Obsidian как `~/Projects/dv-project/`. Подробный flow синхронизации — см. `.opencode/agents/plan.md`.

### При работе с submodule

Для коммита и push изменений в `context/` (включая bump в dv-hub) **всегда используй**:
```
/sync-task "task(DV-XXX): краткое описание"
```

Этот шорткат делает: коммит в submodule → push в submodule → bump в dv-hub → push в dv-hub. Не пиши git-команды вручную.

