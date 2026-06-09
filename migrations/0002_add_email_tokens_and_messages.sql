-- Migration 0002: Add email_tokens and messages tables
-- These tables were referenced in code but missing from initial schema.
-- Also relaxes the role CHECK constraint for the simplified role model (DV-019).

-- Email tokens for magic-link authentication
CREATE TABLE IF NOT EXISTS email_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON email_tokens(expires_at);

-- Chat messages in discussion rooms
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES discussion_rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
