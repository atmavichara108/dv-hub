-- Migration 0003: Telegram auth tokens for webhook-based login flow.
-- Replaces the old Telegram Login Widget with a bot-based auth flow:
--   1. Frontend requests a token via POST /auth/telegram-init
--   2. User opens t.me/<bot>?start=<token>
--   3. Bot webhook records the telegram_id against the token
--   4. User clicks inline URL button → GET /auth/telegram-callback?token=…
--   5. Session created, user redirected to dashboard.

CREATE TABLE IF NOT EXISTS telegram_auth_tokens (
  token TEXT PRIMARY KEY,
  user_telegram_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_telegram_auth_tokens_expires ON telegram_auth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_tokens_used ON telegram_auth_tokens(used);
