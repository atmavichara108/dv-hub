#!/usr/bin/env node
// scripts/init-db.js
// Initialize SQLite database with all migrations.
// Usage: node scripts/init-db.js [db-path]
// Default: ./data/dv-hub.db

import Database from "better-sqlite3";
import { readdirSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const dbPath = process.argv[2] || join(projectRoot, "data", "dv-hub.db");

// Ensure directory exists
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

console.log(`Initializing database: ${dbPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Read and apply migrations in order
const migrationsDir = join(projectRoot, "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${files.length} migration(s)`);

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  console.log(`  Applying: ${file}`);
  db.exec(sql);
}

// Apply seed data if seed.sql exists
const seedPath = join(projectRoot, "seed.sql");
if (existsSync(seedPath)) {
  console.log("Applying seed data...");
  const seedSql = readFileSync(seedPath, "utf-8");
  db.exec(seedSql);
}

db.close();
console.log("Database initialized successfully.");
