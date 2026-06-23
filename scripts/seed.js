#!/usr/bin/env node
// scripts/seed.js
// Seed the database with demo data if empty.
// Usage: node scripts/seed.js [db-path]
// Default: ./data/dv-hub.db or DB_PATH env

import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const dbPath = process.env.DB_PATH || process.argv[2] || join(projectRoot, "data", "dv-hub.db");

if (!existsSync(dbPath)) {
  console.log("Database not found. Run npm run db:init first.");
  process.exit(1);
}

const db = new Database(dbPath);

const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() ;
if (row.count > 0) {
  console.log("Database already has data — skipping seed.");
  db.close();
  process.exit(0);
}

console.log("Seeding database...");

const insertUser = db.prepare(
  "INSERT INTO users (name, role, cell_id) VALUES (?, ?, ?)"
);
const insertTopic = db.prepare(
  "INSERT INTO topics (title, status, cell_id) VALUES (?, ?, ?)"
);
const insertMaterial = db.prepare(
  "INSERT INTO materials (title, type, status, cell_id) VALUES (?, ?, ?, ?)"
);

const transaction = db.transaction(() => {
  insertUser.run("Admin", "admin", 1);
  insertTopic.run("Demo Topic", "proposed", 1);
  insertMaterial.run("Welcome", "note", "raw", 1);
});

transaction();
db.close();
console.log("Seed complete: admin user, demo topic, demo material created.");
