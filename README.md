
# DV Hub — Дискуссионные Вечера

Платформа для организации интеллектуальных дискуссий: от сбора материалов до синтеза результатов.

**Стек:** Hono + TypeScript · Cloudflare Workers/Pages · D1 (SQLite) · Vanilla JS + Tailwind CSS

**Продакшен:** [dv-hub.pages.dev](https://dv-hub.pages.dev)

---

## Что это

Операционная система для распределённой команды, которая исследует темы, проводит дискуссии и публикует результаты. Не лендинг. Рабочий инструмент.

Цикл работы: **материал → тема → дискуссия → синтез → публикация**.

---

## Возможности

**Дашборд** — живая сводка: активные темы, свежие материалы, ближайшие дискуссии, последние публикации. Форма подачи идей без регистрации.

**Инбокс материалов** — ссылки, заметки, видео, статьи, PDF. Статусы (сырой → на разбор → в теме → архив), теги, фильтрация, привязка к темам.

**Доска тем** — kanban-представление по стадиям. Тезис, антитезис, синтез. Фильтрация по приоритету и статусу. Детальная страница с привязанными материалами, комнатами и публикациями.

**Комнаты дискуссий** — создание из темы или отдельно. Дата и время, участники, Jitsi-видеозвонок прямо на странице, чат с поддержкой @упоминаний и #тем, заметки, задачи, смена статуса.

**Чат** — линейная лента сообщений внутри комнаты. Markdown, упоминания участников, ссылки на темы.

**Медиа** — YouTube (автопревью), Spotify, Telegram, подкасты. Привязка к темам.

**Авторизация** — вход через Telegram Login Widget и email magic-link. Гостевой доступ с ограниченными правами.

**Роли** — admin, moderator, researcher, expert, guest, public. Управление через админку.

**Поиск** — полнотекстовый по материалам, темам, комнатам и публикациям. Поиск по тегам.

**FAQ** — встроенная страница для новых участников.

---

## Архитектура

    public/
    └── static/
        ├── app.js                        # Загрузчик модулей
        └── modules/
            ├── utils.js                  # Хелперы, API-обёртки, константы
            ├── auth.js                   # Авторизация, сессии
            ├── search.js                 # Поиск
            ├── dashboard.js              # Дашборд
            ├── materials.js              # Материалы
            ├── topics.js                 # Темы
            ├── rooms.js                  # Комнаты + Jitsi + чат
            ├── media.js                  # Медиа/публикации
            ├── admin.js                  # Админка
            ├── profile.js                # Профиль
            ├── faq.js                    # FAQ
            └── router.js                 # SPA-роутер

    src/
    ├── index.tsx                         # Hono app, HTML shell, OG-теги
    ├── routes/
    │   └── api.ts                        # REST API endpoints
    └── lib/
        └── auth.ts                       # Telegram verify, magic-link, сессии

    migrations/
    └── 0001_initial_schema.sql           # Схема D1

    seed.sql                              # Тестовые данные
    wrangler.jsonc                        # Cloudflare конфиг

---

## Сущности

| Таблица | Назначение |
|---------|------------|
| `cells` | Ячейки (мультитенант-архитектура) |
| `users` | Участники и роли |
| `materials` | Входящие материалы |
| `topics` | Темы дискуссий |
| `discussion_rooms` | Комнаты |
| `messages` | Чат комнат |
| `publications` | Медиа-публикации |
| `sessions` | Авторизационные сессии |

---

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/dashboard` | Сводка |
| GET / POST | `/api/materials` | Список / создание материала |
| PATCH | `/api/materials/:id` | Обновление |
| DELETE | `/api/materials/:id/permanent` | Удаление |
| GET / POST | `/api/topics` | Список / создание темы |
| GET / PATCH | `/api/topics/:id` | Детали / обновление |
| DELETE | `/api/topics/:id` | Удаление (каскадное) |
| GET / POST | `/api/rooms` | Список / создание комнаты |
| GET / PATCH | `/api/rooms/:id` | Детали / обновление |
| DELETE | `/api/rooms/:id` | Удаление |
| GET / POST | `/api/rooms/:id/messages` | Чат комнаты |
| GET / POST | `/api/publications` | Медиа |
| DELETE | `/api/publications/:id` | Удаление |
| POST | `/api/submit-idea` | Анонимная идея |
| GET | `/api/users` | Участники |
| POST | `/auth/telegram` | Вход через Telegram |
| POST | `/auth/email` | Magic-link |
| GET | `/auth/me` | Текущий пользователь |
| POST | `/auth/logout` | Выход |

---

## Запуск локально

```bash
npm install
npm run db:migrate:local
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs````

Сброс базы: `npm run db:reset``

---
Деплой на Cloudflare
```
```bash
npx wrangler d1 create dv-hub-production
# → вставить database_id в wrangler.jsonc

npx wrangler d1 migrations apply dv-hub-production
npm run deploy````

Переменные окружения (Cloudflare Dashboard → Settings → Environment variables): TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, RESEND_API_KEY

Лицензия
AGPL-3.0 — свободное использование, модификация и распространение при условии, что производные работы (включая сетевые сервисы) остаются открытыми под той же лицензией.
---
DV Hub · 2026
