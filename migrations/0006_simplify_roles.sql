-- Migration 0006: Simplify user roles — 6 roles → 3 (admin, member, guest)
-- Old: admin, moderator, researcher, expert, guest, public
-- New: admin, member, guest

-- Step 1: Convert old roles to new ones
UPDATE users SET role = 'admin'  WHERE role IN ('moderator');
UPDATE users SET role = 'member' WHERE role IN ('researcher');
UPDATE users SET role = 'guest'  WHERE role IN ('expert', 'public');

-- Step 2: Re-create the table with new CHECK constraint
-- SQLite doesn't support ALTER CHECK, so we need to recreate
ALTER TABLE users RENAME TO users_old;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'guest' CHECK(role IN ('admin','member','guest')),
  cell_id INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME,
  FOREIGN KEY (cell_id) REFERENCES cells(id)
);

INSERT INTO users (id, telegram_id, email, name, avatar_url, role, cell_id, created_at, last_seen)
SELECT id, telegram_id, email, name, avatar_url, role, cell_id, created_at, last_seen
FROM users_old;

DROP TABLE users_old;
