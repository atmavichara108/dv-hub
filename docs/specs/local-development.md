---
type: Execution Spec
title: dv-hub local development baseline
project: dv-hub
status: active
timestamp: 2026-09-24
---

# Локальный контур разработки

## Канонический путь

```bash
npm ci
cp .env.example .env
npm run db:migrate:local
npm run dev
```

Приложение доступно на `http://localhost:8787`. Для защищённых сценариев нажать
«Войти» → «Войти как локальный admin». Telegram, Resend, VPS, PM2 и Nginx для
обычной разработки не нужны.

Нативный сервер по умолчанию слушает `127.0.0.1`. Compose слушает `0.0.0.0`
внутри контейнера, но публикует порт только на `127.0.0.1` хоста.

`LOCAL_AUTH_ENABLED=true` работает только при `NODE_ENV=development`. Локальный
вход использует первого сидового пользователя с ролью `admin`.

## Docker

Docker Compose является запасным изолированным контуром, а не обязательным слоем:

```bash
docker compose up --build
```

Код подключается bind-mount, зависимости находятся внутри контейнера, SQLite — в
named volume `dv-hub-data`. В текущей сессии Docker-команды запрещены локальной
permission policy, поэтому этот путь остаётся непроверенным runtime-гейтом.

## Проверки

```bash
npm run ci
npm audit --omit=dev
```

На 2026-09-24 `npm run ci` проходит. Production audit после обновления lockfile
показывает 0 известных уязвимостей.

## Findings актуального аудита

- Код работает на Node.js + better-sqlite3; прежние заявления README и AGENTS о
  current Cloudflare runtime были документационным drift и исправлены.
- Без внешних провайдеров ранее нельзя было получить сессию и проверить write/admin
  сценарии. Добавлен production-safe dev-login.
- Живые данные Cloudflare по-прежнему не восстановлены. Это отдельная задача из
  `data-recovery.md`; для разработки используется seed-набор.
- `backup.sql` и `clean-backup.sql` остаются tracked по явному решению recovery spec.
  Они содержат идентифицируемую сидовую запись и не должны пополняться реальными
  данными или секретами.
- Локальный `.env` содержит реальные credentials и не отслеживается Git. Значения
  не должны переноситься в `.env.example`.
- UI загружает Tailwind, Axios, Day.js, Font Awesome и Google Fonts из CDN, поэтому
  полностью offline-режим пока не поддержан.
- Покрытие тестами остаётся узким: API smoke + auth boundary, без браузерного E2E.

## Открытые гейты

1. Первый подтверждённый `docker compose up --build`.
2. Ручной smoke четырёх базовых продуктовых сценариев.
3. Браузерный E2E для login/write/admin и мобильной вёрстки.
4. Решение по живым данным до любого production-переноса.
