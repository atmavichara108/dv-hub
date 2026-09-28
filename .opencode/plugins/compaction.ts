// .opencode/plugins/compaction.ts
// Inject persistent project context during session compaction.
// Нативный V2-формат (OpenCode 2.0.18): Plugin.define({ id, setup(ctx) }).
//
// Маппинг хуков V1 → V2:
//   session.compact (D2, V1: пост-хук, принимал { summary } и возвращал
//     модифицированный summary) → ctx.session.hook("compaction", ...)
//   session.idle (V1 no-op placeholder) → дропнут (в V2 отдельного хука нет,
//     no-op подписки не требует — подтверждено по схеме событий).
//
// V2 (подтверждено по схеме SessionCompaction): пост-хука над итоговым
//   summary нет по дизайну — hook срабатывает ДО вызова модели-суммаризатора,
//   а event.result пропускает LLM-саммари полностью (summary писали бы сами и
//   потеряли сжатие истории). Поэтому persistent context инжектится в event.system
//   промпта компакции: он виден модели-суммаризатору и должен пережить компакцию,
//   но итоговый summary формирует модель — текст может отличаться от V1.
// V2: V1 session.idle был no-op placeholder'ом; отдельного хука session.idle в V2
//   нет, no-op не требует подписки на события — хук дропнут без потери поведения.

import { Plugin } from "@opencode/plugin"

const PERSISTENT_CONTEXT = `
# DV Hub — Persistent Context (injected on compaction)

## Phase
Phase 0 — Self-hosted infrastructure migration (Cloudflare Pages → VPS).
Current critical path: DV-005 → DV-006 → DV-006a → DV-008 → DV-027.

## Stack (target)
- Runtime: Node.js LTS + PM2
- Web: Hono + TypeScript (strict)
- DB: SQLite (migrating from Cloudflare D1)
- Reverse proxy: Nginx + Let's Encrypt
- Video: MiroTalk SFU on meet.re-search.wiki
- Auth: Telegram widget + email magic-link (Resend)

## Domain
re-search.wiki (root), meet.re-search.wiki (SFU), optional drive./meetily.

## Anti-goals (never propose these)
- Social feed, likes, follower counts
- Public CMS / SaaS product
- Docker / Kubernetes (we use bare PM2)
- Closed-source dependencies for core flow

## Workflow rules
- Funnel: material → topic → discussion → synthesis → publication
- Consent-based (S3 sociocracy), self-hosted, privacy-first
- All architectural decisions go to docs/architecture.md as ADRs
- Code in English, conversation in Russian
- Kanban tasks live in context/DV/Operations/Kanban/Tasks/

## Current agents
plan (strategy), build (code), reviewer (review),
researcher (spikes), infra (DevOps).

## Recent key ADRs
- ADR-001: VPS Zomro Poland + Nginx + PM2 (no Docker)
- ADR-002: MiroTalk SFU for video on meet.re-search.wiki
- ADR-003: Meetily for transcription
- ADR-004: Twake Drive for file storage
`.trim()

const plugin = Plugin.define({
  id: "dv-hub-compaction",
  async setup(ctx) {
    await ctx.session.hook("compaction", (event: { system?: Array<{ type: string; text: string }> }) => {
      try {
        event.system?.push({ type: "text", text: PERSISTENT_CONTEXT })
      } catch (err) {
        console.error(`[dv-hub-compaction] inject persistent context failed: ${err}`)
      }
    })
  },
})

export default plugin
