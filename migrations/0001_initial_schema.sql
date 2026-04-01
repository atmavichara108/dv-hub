-- DV Hub: Дискуссионные Вечера — Research & Discussion Hub
-- Initial schema v1

-- Ячейки (будущая поддержка мультиячейковой сети)
CREATE TABLE IF NOT EXISTS cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_public INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'guest' CHECK(role IN ('admin','moderator','researcher','expert','guest','public')),
  cell_id INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME,
  FOREIGN KEY (cell_id) REFERENCES cells(id)
);

-- Материалы (инбокс сырья)
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cell_id INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  url TEXT,
  content TEXT,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'link' CHECK(type IN ('link','note','video','article','pdf','idea','voice')),
  tags TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'raw' CHECK(status IN ('raw','review','linked','archive')),
  author_id INTEGER,
  topic_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cell_id) REFERENCES cells(id),
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

-- Темы (сердце системы)
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cell_id INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  question TEXT,
  thesis TEXT,
  antithesis TEXT,
  synthesis TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','ripening','scheduled','in_discussion','synthesized','published','archive')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
  tags TEXT DEFAULT '[]',
  owner_id INTEGER,
  is_public INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cell_id) REFERENCES cells(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Комнаты дискуссий
CREATE TABLE IF NOT EXISTS discussion_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cell_id INTEGER NOT NULL DEFAULT 1,
  topic_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at DATETIME,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK(status IN ('preparing','active','completed','cancelled')),
  participants TEXT DEFAULT '[]',
  notes TEXT,
  thesis TEXT,
  antithesis TEXT,
  synthesis TEXT,
  outcomes TEXT,
  tasks TEXT DEFAULT '[]',
  is_public INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cell_id) REFERENCES cells(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Публикации (видео, подкасты, статьи)
CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cell_id INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'other' CHECK(platform IN ('youtube','spotify','apple_podcasts','rss','telegram','substack','other')),
  type TEXT NOT NULL DEFAULT 'video' CHECK(type IN ('video','podcast','article','post')),
  description TEXT,
  thumbnail_url TEXT,
  topic_id INTEGER,
  room_id INTEGER,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cell_id) REFERENCES cells(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (room_id) REFERENCES discussion_rooms(id)
);

-- Сессии (для простой аутентификации)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_materials_cell ON materials(cell_id);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_topic ON materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_cell ON topics(cell_id);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_rooms_cell ON discussion_rooms(cell_id);
CREATE INDEX IF NOT EXISTS idx_rooms_topic ON discussion_rooms(topic_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON discussion_rooms(status);
CREATE INDEX IF NOT EXISTS idx_publications_topic ON publications(topic_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Базовая ячейка
INSERT OR IGNORE INTO cells (id, name, slug, description) VALUES 
  (1, 'Дискуссионные Вечера', 'dv-main', 'Основная ячейка — исследования, дискуссии, синтез');
