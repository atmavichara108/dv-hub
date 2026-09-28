// .opencode/plugins/notify.ts
// Native V2: Plugin.define + ctx.event.subscribe().
// Хук: event.subscribe с фильтром event.type === "session.idle" → notify-send.
// AbortController отменяет in-flight notify-send при teardown плагина.
// Named export Notify сохранён как алиас для обратной совместимости.

import { Plugin } from "@opencode/plugin"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const plugin = Plugin.define({
  id: "dv-hub-notify",
  async setup(ctx) {
    const controller = new AbortController()
    const { signal } = controller

    ctx.event.subscribe(
      (event) => {
        if (event.type !== "session.idle") return
        void execFileAsync("notify-send", ["opencode", "Session idle", "--icon=terminal"], {
          signal,
        }).catch(() => {
          // тихо проглатываем если notify-send недоступен
        })
      },
      { signal },
    )

    return () => controller.abort()
  },
})

// Named export alias for backward compatibility
export const Notify = plugin
export default plugin
