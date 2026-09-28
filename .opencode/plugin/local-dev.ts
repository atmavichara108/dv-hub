// .opencode/plugin/local-dev.ts
// Starts the deterministic localhost bootstrap when OpenCode loads the project.
// Нативный V2-формат (OpenCode 2.0.18): Plugin.define({ id, setup(ctx) }).
// Хуков нет — только init-код в setup.
//
// Маппинг V1 → V2:
//   $ Bun shell-хелпер → node:child_process (execFile node scripts/ensure-local-dev.js)
//   directory → ctx.location.directory; client.app.log → console

import { Plugin } from "@opencode/plugin"
import { execFile } from "node:child_process"

const plugin = Plugin.define({
  id: "dv-hub-local-dev",
  async setup(ctx) {
    const directory = ctx.location.directory
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(
          "node",
          ["scripts/ensure-local-dev.js"],
          { cwd: directory },
          (err) => (err ? reject(err) : resolve()),
        )
      })
      console.log("[dv-hub-local-dev] localhost development server is ready on 127.0.0.1:8787")
    } catch (error) {
      console.error(`[dv-hub-local-dev] automatic localhost bootstrap failed: ${error}`)
    }
  },
})

export default plugin
