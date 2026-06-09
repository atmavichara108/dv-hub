
import type { Plugin } from "@opencode-ai/plugin"

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

export const EnvGuard: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "read" || input.tool === "edit" || input.tool === "write") {
        const path = output.args.filePath || output.args.file || ""
        for (const pattern of FORBIDDEN_PATHS) {
          if (pattern.test(path)) {
            throw new Error(`EnvGuard: refusing to access ${path} — protected by security policy`)
          }
        }
      }
      if (input.tool === "bash") {
        const cmd = output.args.command || ""
        for (const pattern of FORBIDDEN_PATHS) {
          if (pattern.test(cmd)) {
            throw new Error(`EnvGuard: bash command touches protected path: ${cmd}`)
          }
        }
      }
    },
  }
}
