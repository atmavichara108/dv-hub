
// .opencode/plugins/compaction.ts
// Inject persistent project context during session compaction.
// Compaction triggers when context window fills; without this hook
// the agent forgets phase/stack/anti-goals.

import type { Plugin } from "@opencode-ai/plugin"

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

const plugin: Plugin = async ({ project, directory }) => {
  return {
    // Fires when opencode compacts the session to free context window.
    // We append persistent context to the compaction summary so agent
    // doesn't lose project-critical knowledge.
    "session.compact": async ({ session, summary }) => {
      return {
        summary: `${summary}\n\n---\n\n${PERSISTENT_CONTEXT}`,
      }
    },

    // Optional: log compaction events for debugging
    "session.idle": async ({ session }) => {
      // no-op — placeholder for future notification plugin
    },
  }
}

export default plugin
