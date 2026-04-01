-- Seed data для DV Hub
INSERT OR IGNORE INTO users (id, name, telegram_id, role) VALUES 
  (1, 'Макс Рудра', 'max_rudra', 'admin');

INSERT OR IGNORE INTO materials (title, url, type, description, tags, status, author_id) VALUES
  ('Что такое соларпанк?', 'https://www.youtube.com/watch?v=hHI61GHNGJM', 'video', 'Базовый ролик о движении', '["solarpunk","введение"]', 'review', 1),
  ('Permaculture Research Institute', 'https://www.permaculturenews.org/', 'link', 'Архив статей по пермакультуре', '["permaculture","ресурс"]', 'raw', 1),
  ('Идея: обсудить роль технологий в экопоселениях', NULL, 'idea', 'Противоречие между lo-tech и hi-tech в устойчивых сообществах', '["технологии","экопоселение"]', 'review', 1);

INSERT OR IGNORE INTO topics (title, question, thesis, antithesis, status, priority, tags, owner_id, is_public) VALUES
  ('Технологии в экопоселении: союзник или враг?', 'Где граница между технологичностью и устойчивостью?', 'Современные технологии — необходимый инструмент для масштабирования устойчивых практик', 'Технологическая зависимость разрушает ту самую автономность, к которой стремится экопоселение', 'ripening', 'high', '["технологии","экопоселение","solarpunk"]', 1, 1),
  ('Роль дискуссии в формировании смыслов сообщества', 'Может ли регулярная дискуссия заменить манифест?', NULL, NULL, 'proposed', 'medium', '["сообщество","дискуссия","смыслы"]', 1, 0),
  ('Пермакультура как системное мышление', 'Как принципы пермакультуры работают вне сельского хозяйства?', NULL, NULL, 'proposed', 'medium', '["permaculture","системное мышление"]', 1, 0);

INSERT OR IGNORE INTO discussion_rooms (topic_id, title, description, status, is_public, created_by) VALUES
  (1, 'Технологии и экопоселение #1', 'Первичное обсуждение противоречия lo-tech vs hi-tech', 'preparing', 1, 1);

INSERT OR IGNORE INTO publications (title, url, platform, type, description, topic_id) VALUES
  ('Solarpunk: A new hope?', 'https://www.youtube.com/watch?v=UqJJktxCY9U', 'youtube', 'video', 'Обзор соларпанк движения', 1);
