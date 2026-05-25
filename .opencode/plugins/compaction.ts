
import type { Plugin } from "@opencode-ai/plugin"

export const PlanCompaction: Plugin = async () => {
  return {
    "experimental.session.compacting": async (input, output) => {
      output.context.push(`## DV Hub — persistent context
Always keep across compaction:
- Текущая фаза: Phase 0 (миграция Cloudflare → VPS).
- Целевой домен: re-search.wiki.
- Стек target: Hono + Node.js + PM2 + Nginx + SQLite.
- Какой ADR обсуждался последним.
- Какая задача DV-XXX в работе.
- product-vision.md anti-goals.
`)
    },
  }
}
