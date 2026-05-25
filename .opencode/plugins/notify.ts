
import type { Plugin } from "@opencode-ai/plugin"

export const Notify: Plugin = async ({ $ }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        try {
          // Linux notify-send (Manjaro/GNOME/KDE есть из коробки)
          await $`notify-send "opencode" "Session idle" --icon=terminal`.quiet()
        } catch {
          // тихо проглатываем если notify-send недоступен
        }
      }
    },
  }
}
