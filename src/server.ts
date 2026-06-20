// src/server.ts
// Node.js entry point for DV Hub.
// Мигрировано с Cloudflare Workers на Node.js + better-sqlite3 (DV-008).
//
// Запуск: node dist/server.js
// Порт: 8787 (или env PORT)
// БД: SQLite файл в data/dv-hub.db (или env DB_PATH)

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./index";
import { cleanupExpiredTelegramTokens } from "./lib/auth";

// Load .env from project root
dotenv.config();

// ── Database ──────────────────────────────────────────────────
const dbPath = process.env.DB_PATH || "./data/dv-hub.db";

// Ensure data directory exists
const dbDir = join(dbPath, "..");
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Clean up expired telegram tokens on startup
cleanupExpiredTelegramTokens(db);

// Periodic cleanup every hour
setInterval(() => cleanupExpiredTelegramTokens(db), 60 * 60 * 1000);

// ── Create app with env ───────────────────────────────────────
const app = createApp({
  DB: db,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || "",
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "",
});

// ── Static files ──────────────────────────────────────────────
// Serve files from public/ directory: /static/* → public/static/*
app.use(
  "/static/*",
  serveStatic({
    root: "./public",
  }),
);

// ── Start server ──────────────────────────────────────────────
const port = parseInt(process.env.PORT || "8787", 10);

console.log(`DV Hub starting...`);
console.log(`  Database: ${dbPath}`);
console.log(`  Port: ${port}`);
console.log(`  Node.js: ${process.version}`);

serve(
  {
    fetch: (req: Request) =>
      app.fetch(req, {
        DB: db,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
        TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || "",
        TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || "",
        RESEND_API_KEY: process.env.RESEND_API_KEY || "",
        RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "",
      }),
    port,
  },
  (info) => {
    console.log(`DV Hub listening on http://localhost:${info.port}`);
  },
);

// ── Graceful shutdown ─────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("Shutting down...");
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  db.close();
  process.exit(0);
});
