#!/usr/bin/env node
// scripts/init-db.js
// Initialize SQLite database with all migrations (idempotent).
// Usage: node scripts/init-db.js [db-path]
// Default: ./data/dv-hub.db (or DB_PATH env)
//
// Migrations are tracked in a `schema_migrations` table, so re-running this
// script is safe: already-applied migrations are skipped. A database that
// predates the tracking table is baselined (all current migrations marked
// applied) instead of being re-run. Seed data is applied only on a fresh
// database.

import Database from "better-sqlite3";
import { readdirSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const dbPath =
  process.argv[2] ||
  process.env.DB_PATH ||
  join(projectRoot, "data", "dv-hub.db");

const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

console.log(`Initializing database: ${dbPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// FK enforcement is disabled while applying migrations, then re-enabled.
// Migration 0006 rebuilds `users` via ALTER TABLE RENAME. Two pragmas are
// required to keep child-table FKs consistent:
//   - foreign_keys OFF: lets 0006 drop/recreate the parent without FK errors.
//   - legacy_alter_table ON: stops RENAME from rewriting child FKs to the
//     transient `users_old` name (which would leave them dangling).
db.exec("PRAGMA foreign_keys = OFF");
db.exec("PRAGMA legacy_alter_table = ON");

// ── Migration tracking ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const migrationsDir = join(projectRoot, "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const appliedCount = db
  .prepare(`SELECT COUNT(*) AS n FROM schema_migrations`)
  .get().n;

// A pre-existing database (schema present, tracking absent) gets baselined:
// mark the current migration set as applied rather than re-running it.
const hasLegacySchema = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'cells') LIMIT 1`,
  )
  .get();

const wasEmpty = !hasLegacySchema;

if (appliedCount === 0 && hasLegacySchema) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO schema_migrations (filename) VALUES (?)`,
  );
  const baseline = db.transaction(() => {
    for (const file of files) insert.run(file);
  });
  baseline();
  console.log(
    `Baseline: marked ${files.length} existing migration(s) as applied.`,
  );
}

// ── Apply pending migrations ────────────────────────────────
let applied = 0;
for (const file of files) {
  const already = db
    .prepare(`SELECT 1 FROM schema_migrations WHERE filename = ?`)
    .get(file);
  if (already) continue;

  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  const run = db.transaction(() => {
    db.exec(sql);
    db.prepare(`INSERT INTO schema_migrations (filename) VALUES (?)`).run(file);
  });
  run();
  applied += 1;
  console.log(`  Applied: ${file}`);
}

// Re-enable foreign keys for seed data and runtime integrity.
db.exec("PRAGMA foreign_keys = ON");
// ── Seed data (fresh databases only) ────────────────────────
const seedPath = join(projectRoot, "seed.sql");
if (wasEmpty && existsSync(seedPath)) {
  console.log("Applying seed data...");
  db.exec(readFileSync(seedPath, "utf-8"));
}

db.close();
console.log(
  applied === 0
    ? "Database already up to date."
    : "Database initialized successfully.",
);
