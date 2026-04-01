# DV Hub — Дискуссионные Вечера
## Research & Discussion Hub · MVP v0.1

---

## Что это

Рабочая платформа для распределённой команды, занимающейся исследованием тем, подготовкой дискуссий и публикацией результатов.

**Не лендинг. Операционная система ячейки.**

---

## Функциональность MVP

### Реализовано
- **Дашборд** — живой главный экран: активные темы, новые материалы, ближайшие дискуссии, последние публикации + форма подачи идей без логина
- **Инбокс материалов** — добавление ссылок, заметок, идей, видео; теги, статусы (сырой → на разбор → в теме → архив); фильтрация
- **Доска тем** — kanban по статусам + список view; тезис/антитезис/синтез; фильтрация по приоритету и статусу; детальная страница темы
- **Комнаты дискуссий** — создание комнат из темы или отдельно; участники, заметки, тезис/антитезис/синтез, смена статуса
- **Медиараздел** — YouTube превью (автоматически), Spotify, Telegram и другие платформы; привязка к темам и дискуссиям
- **Публичный режим** — форма отправки идей без регистрации на главной странице

### Не реализовано (следующий этап)
- Telegram Login Widget (требует домена + бота)
- Magic link через email
- Полноценные роли и права доступа
- Экспорт данных (JSON/CSV)
- Realtime-уведомления
- Поиск по всем сущностям

---

## Архитектура

**Стек:** Hono + TypeScript → Cloudflare Workers/Pages  
**База данных:** Cloudflare D1 (SQLite, global edge)  
**Фронтенд:** SPA на vanilla JS + Tailwind CSS CDN  

### Сущности

| Сущность | Описание |
|----------|----------|
| `cells` | Ячейки (сейчас одна, архитектурно готово к сети) |
| `users` | Пользователи, роли: admin/moderator/researcher/expert/guest/public |
| `materials` | Сырьё: ссылки, идеи, видео, статьи, заметки, PDF, голосовые |
| `topics` | Темы: вопрос → тезис → антитезис → синтез |
| `discussion_rooms` | Комнаты: подготовка + след обсуждения |
| `publications` | Медиа: YouTube, Spotify, Telegram, подкасты |
| `sessions` | Сессии аутентификации |

### Статусы материалов
`raw → review → linked → archive`

### Статусы тем
`proposed → ripening → scheduled → in_discussion → synthesized → published → archive`

### Статусы комнат
`preparing → active → completed → cancelled`

---

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/dashboard` | Дашборд: топ-5 по каждой сущности |
| GET/POST | `/api/materials` | Материалы |
| PATCH/DELETE | `/api/materials/:id` | Обновление/архивация |
| GET/POST | `/api/topics` | Темы |
| GET/PATCH | `/api/topics/:id` | Детальная страница темы |
| GET/POST | `/api/rooms` | Комнаты дискуссий |
| GET/PATCH | `/api/rooms/:id` | Детальная страница комнаты |
| GET/POST | `/api/publications` | Публикации |
| POST | `/api/submit-idea` | Анонимная отправка идеи |
| GET | `/api/users` | Список участников |

---

## Структура

```
webapp/
├── src/
│   ├── index.tsx          # Hono app, HTML shell, роутинг
│   └── routes/
│       └── api.ts         # Все API endpoints
├── public/
│   └── static/
│       └── app.js         # SPA фронтенд (~1600 строк)
├── migrations/
│   └── 0001_initial_schema.sql
├── seed.sql               # Тестовые данные
├── wrangler.jsonc         # Cloudflare конфиг
├── ecosystem.config.cjs   # PM2 конфиг
└── package.json
```

---

## Запуск (sandbox/dev)

```bash
# 1. Применить миграции
npm run db:migrate:local

# 2. Загрузить тестовые данные
npm run db:seed

# 3. Сборка
npm run build

# 4. Запуск через PM2
pm2 start ecosystem.config.cjs
```

## Сброс базы данных
```bash
npm run db:reset  # удаляет локальную БД, применяет миграции, загружает seed
```

---

## Деплой на Cloudflare Pages

```bash
# Требуется: настроенный wrangler + созданная D1 база
npx wrangler d1 create dv-hub-production
# Вставить database_id в wrangler.jsonc
npx wrangler d1 migrations apply dv-hub-production
npm run deploy
```

---

## Принцип переносимости

- API-first: весь бэкенд отвечает JSON
- D1 SQLite: стандартный SQL, легко мигрировать
- Markdown-friendly поля: notes, synthesis, thesis — plaintext
- Без vendor lock-in на уровне логики

---

*DV Hub · 2026 · v0.1 MVP*
