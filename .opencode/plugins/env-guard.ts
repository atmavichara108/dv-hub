// .opencode/plugins/env-guard.ts
// Нативный V2-формат (OpenCode 2.0.18): Plugin.define({ id, setup(ctx) }).
//
// Маппинг хуков V1 → V2:
//   tool.execute.before → ctx.tool.hook("execute.before", ...)
//     V1 (input.tool, output.args) → V2 (event.tool, event.input)
//     Список FORBIDDEN_PATHS и условия блокировок сохранены 1:1.
// Named export EnvGuard сохранён как алиас для обратной совместимости.

import { Plugin } from "@opencode/plugin"

const FORBIDDEN_PATHS = [
  /\.env(\.|$)(?!example)/,
  /auth\.json$/,
  /\.ssh\//,
  /keys-passwords/,
  /id_rsa/,
  /id_ed25519/,
  /\/etc\/shadow/,
  /\/etc\/passwd/,
]

const toolExecuteBefore = async (event: { tool?: string; input?: any }) => {
  const tool = String(event?.tool ?? "")
  const args = event?.input ?? {}
  if (tool === "read" || tool === "edit" || tool === "write") {
    const path = args.filePath || args.file || ""
    for (const pattern of FORBIDDEN_PATHS) {
      if (pattern.test(path)) {
        throw new Error(`EnvGuard: refusing to access ${path} — protected by security policy`)
      }
    }
  }
  if (tool === "bash") {
    const cmd = args.command || ""
    for (const pattern of FORBIDDEN_PATHS) {
      if (pattern.test(cmd)) {
        throw new Error(`EnvGuard: bash command touches protected path: ${cmd}`)
      }
    }
  }
}

const plugin = Plugin.define({
  id: "env-guard",
  async setup(ctx) {
    await ctx.tool.hook("execute.before", toolExecuteBefore)
  },
})

// Named export alias for backward compatibility
export const EnvGuard = plugin
export default plugin
