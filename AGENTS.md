---

# DV Hub — Agent Instructions

## Project Overview

Research hub for discussion community. Platform for collaborative knowledge management: materials, topics, discussion rooms, publications.

## Stack

- Runtime: Cloudflare Workers (Hono framework)
- Language: TypeScript (strict mode)
- Database: Cloudflare D1 (SQLite)
- Frontend: Vanilla JS (ES Modules) + Tailwind CSS
- Build: Vite
- Deploy: Cloudflare Pages (`npm run deploy`)
- Package manager: npm

## Commands

- `npm run dev` — local dev server (Vite)
- `npm run build` — production build
- `npm run deploy` — deploy to Cloudflare Pages
- `npm run db:migrate:local` — apply migrations locally
- `npm run db:seed` — seed database
- `npm run db:reset` — drop + migrate + seed

## Project Structure

src/ index.tsx # Hono app, HTML shell, OG meta routes/ api.ts # All REST API endpoints lib/ auth.ts # Telegram verify, magic-link, sessions

public/static/ app.js # Entry point, SPA router modules/ utils.js # Helpers, API calls auth.js # Auth UI logic search.js # Search dashboard.js # Dashboard materials.js # Materials CRUD topics.js # Topics rooms.js # Discussion rooms + Jitsi media.js # Media embeds admin.js # Admin panel profile.js # User profile faq.js # FAQ router.js # SPA routing

migrations/ 0001_initial_schema.sql # D1 schema

seed.sql # Test data wrangler.jsonc # Cloudflare config

Copy

## Database Tables

- `cells` — knowledge units (soft-delete)
- `users` — accounts
- `materials` — resources
- `topics` — discussion topics
- `discussion_rooms` — rooms with Jitsi
- `messages` — room messages
- `publications` — published articles
- `sessions` — auth sessions

## Auth

- Telegram Login Widget (primary)
- Email magic-link (fallback)
- Roles: admin, moderator, researcher, expert, guest, public
- Sessions stored in D1

## API Conventions

- All endpoints prefixed with `/api/`
- JSON request/response
- Error format: `{ error: string, details?: any }`
- Status codes: 400 for client errors, 500 for server errors
- Auth via session cookie, verified in middleware

## Code Conventions

- TypeScript strict mode
- No `any` unless absolutely necessary
- Hono context typing for all route handlers
- Frontend modules export `init()` function
- Tailwind utility classes, no custom CSS
- SQL migrations sequential: 0001*, 0002*, etc.

## Important Notes

- D1 is SQLite — no RETURNING \* on INSERT (use separate SELECT)
- Wrangler bindings: DB (D1), TELEGRAM_BOT_TOKEN, RESEND_API_KEY
- Frontend is SPA with hash routing, no SSR
- All frontend modules loaded dynamically by router.js

## Communication

Always respond in Russian. Code and commit messages in English.

## CI/CD Workflows

### Deployment Pipeline

1. **Build**: Compile and package artifacts
2. **Test**: Run unit/integration tests
3. **Deploy**: Roll out to staging/production
4. **Verify**: Health checks and smoke tests

### Rollback Procedures

- Trigger: Failed migrations or health checks
- Steps:
  - Revert to last stable deployment
  - Notify team via Slack/email

### Error Handling Standards

- **Legacy Mobile**: `{ ok: boolean, error: string }`
- **Modern Clients**: `{ error: { code: number, message: string } }`
- **HTTP Codes**:
  - `400` for client errors
  - `500` for server/D1 failures
