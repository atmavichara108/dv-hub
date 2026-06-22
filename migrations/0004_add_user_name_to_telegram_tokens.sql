-- Migration 0004: Add user_name column to telegram_auth_tokens
-- Captures the real Telegram user name from the webhook /start message
-- so it can be used when creating the user record.

ALTER TABLE telegram_auth_tokens ADD COLUMN user_name TEXT;
