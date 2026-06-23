-- Migration 0005: Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_publications_room ON publications(room_id);
CREATE INDEX IF NOT EXISTS idx_publications_published ON publications(published_at);
