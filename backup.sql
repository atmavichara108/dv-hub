PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" VALUES(1,'0001_initial_schema.sql','2026-04-03 19:12:14');
CREATE TABLE cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_public INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "cells" VALUES(1,'Дискуссионные Вечера','dv-main','Основная ячейка — исследования, дискуссии, синтез',1,'2026-04-03 19:12:14');
CREATE TABLE users (
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
INSERT INTO "users" VALUES(1,'max_rudra',NULL,'Макс Рудра',NULL,'admin',1,'2026-04-03 19:12:26',NULL);
CREATE TABLE materials (
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
INSERT INTO "materials" VALUES(1,1,'Что такое соларпанк?','https://www.youtube.com/watch?v=hHI61GHNGJM',NULL,'Базовый ролик о движении','video','["solarpunk","введение"]','review',1,NULL,'2026-04-03 19:12:26','2026-04-03 19:12:26');
INSERT INTO "materials" VALUES(2,1,'Permaculture Research Institute','https://www.permaculturenews.org/',NULL,'Архив статей по пермакультуре','link','["permaculture","ресурс"]','raw',1,NULL,'2026-04-03 19:12:26','2026-04-03 19:12:26');
INSERT INTO "materials" VALUES(3,1,'Идея: обсудить роль технологий в экопоселениях',NULL,NULL,'Противоречие между lo-tech и hi-tech в устойчивых сообществах','idea','["технологии","экопоселение"]','review',1,NULL,'2026-04-03 19:12:26','2026-04-03 19:12:26');
CREATE TABLE topics (
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
INSERT INTO "topics" VALUES(1,1,'Технологии в экопоселении: союзник или враг?','Где граница между технологичностью и устойчивостью?','Современные технологии — необходимый инструмент для масштабирования устойчивых практик','Технологическая зависимость разрушает ту самую автономность, к которой стремится экопоселение',NULL,'ripening','high','["технологии","экопоселение","solarpunk"]',1,1,'2026-04-03 19:12:26','2026-04-03 19:12:26');
INSERT INTO "topics" VALUES(2,1,'Роль дискуссии в формировании смыслов сообщества','Может ли регулярная дискуссия заменить манифест?',NULL,NULL,NULL,'proposed','medium','["сообщество","дискуссия","смыслы"]',1,0,'2026-04-03 19:12:26','2026-04-03 19:12:26');
INSERT INTO "topics" VALUES(3,1,'Пермакультура как системное мышление','Как принципы пермакультуры работают вне сельского хозяйства?',NULL,NULL,NULL,'proposed','medium','["permaculture","системное мышление"]',1,0,'2026-04-03 19:12:26','2026-04-03 19:12:26');
CREATE TABLE discussion_rooms (
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
INSERT INTO "discussion_rooms" VALUES(1,1,1,'Технологии и экопоселение #1','Первичное обсуждение противоречия lo-tech vs hi-tech',NULL,'preparing','[]',NULL,NULL,NULL,NULL,NULL,'[]',1,1,'2026-04-03 19:12:26','2026-04-03 19:12:26');
CREATE TABLE publications (
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
INSERT INTO "publications" VALUES(1,1,'Solarpunk: A new hope?','https://www.youtube.com/watch?v=UqJJktxCY9U','youtube','video','Обзор соларпанк движения',NULL,1,NULL,NULL,'2026-04-03 19:12:26');
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('cells',1);
INSERT INTO "sqlite_sequence" VALUES('d1_migrations',1);
INSERT INTO "sqlite_sequence" VALUES('users',1);
INSERT INTO "sqlite_sequence" VALUES('materials',3);
INSERT INTO "sqlite_sequence" VALUES('topics',3);
INSERT INTO "sqlite_sequence" VALUES('discussion_rooms',1);
INSERT INTO "sqlite_sequence" VALUES('publications',1);
CREATE INDEX idx_materials_cell ON materials(cell_id);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_materials_topic ON materials(topic_id);
CREATE INDEX idx_topics_cell ON topics(cell_id);
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_rooms_cell ON discussion_rooms(cell_id);
CREATE INDEX idx_rooms_topic ON discussion_rooms(topic_id);
CREATE INDEX idx_rooms_status ON discussion_rooms(status);
CREATE INDEX idx_publications_topic ON publications(topic_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);