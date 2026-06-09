import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "src/server.ts",
      output: {
        entryFileNames: "server.js",
      },
      // Native modules that must not be bundled
      external: [
        "better-sqlite3",
        "dotenv",
        "resend",
        "@hono/node-server",
        "@hono/node-server/serve-static",
      ],
    },
    target: "node20",
    ssr: true,
    // Copy public/ contents to dist/static/ for production
    copyPublicDir: false,
  },
});
