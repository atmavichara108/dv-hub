---
title: Kanban Board
date: 2026-11-07
generated-by: scripts/rebuild-kanban.sh (single source of truth — карточки DV-*.md)
---

# Kanban Board

> Авто-пересборка: 2026-11-07 09:47. Не редактировать доску вручную —
> доска строится из статусов карточек. Правь status в карточке.

Правило доски: стартовала — сразу 🟡 In Progress; выполнена — сразу 🟢 Done.
Источник правды — status в DV-*.md; доска — производная (rebuild-kanban.sh).

## 🟡 In Progress (2)

| ID | Задача | Приоритет | Эпик | Объём |
|---|---|---|---|---|
| DV-030 | [[DV-030 Переезд на Zomro|Переезд ДВ-Хаб на Zomro -ADR-010-]] | 🔥 | Self-hosted Infra | L |
| DV-043 | [[DV-043 Канон связи работа и карточка|Канон- работа в dv-hub обязана иметь карточку в канбане]] | 🔥 | Process | S |

## 🟠 Ready (3)

| ID | Задача | Приоритет | Эпик | Объём |
|---|---|---|---|---|
| DV-012 | [[DV-012 Настроить coturn TURN STUN сервер|Настроить coturn -TURN-STUN сервер-]] | ⭐ | Conferencing | M |
| DV-041 | [[DV-041 Правка deploy-mirotalk на сервере|Правка deploy-mirotalk.sh на сервере -точечный фикс вне репо-]] | • | Conferencing | XS |
| DV-042 | [[DV-042 Точный PAT для CI dv-project|CI dv-project падает- нужен точечный PAT владельца]] | ⭐ | Self-hosted Infra | XS |

## ⚪ Backlog (11)

| ID | Задача | Приоритет | Эпик | Объём |
|---|---|---|---|---|
| DV-014 | [[DV-014 Развернуть Meetily|Развернуть Meetily для транскрипции -CPU MVP-]] | • | Conferencing | M |
| DV-015 | [[DV-015 Воркфлоу запись комнаты → транскрипт → черновик синтеза|Воркфлоу- запись комнаты → транскрипт → черновик синтеза]] | • | Conferencing | L |
| DV-016 | [[DV-016 Рефакторинг главной под 4 сценария|Рефакторинг главной страницы под 4 сценария входа]] | ⭐ | Site UX MVP | M |
| DV-017 | [[DV-017 FAQ-копирайт|Переписать FAQ под актуальный self-host стек]] | • | Site UX MVP | XS |
| DV-018 | [[DV-018 Адаптивная вёрстка|Адаптивная вёрстка под мобильные устройства]] | • | Site UX MVP | M |
| DV-021 | [[DV-021 Стадии темы как машина состояний|Стадии темы как машина состояний в БД]] | ⭐ | Research Workflow | M |
| DV-022 | [[DV-022 Страница темы с привязанными материалами и комнатами|Страница темы- материалы- комнаты- синтез на одном экране]] | ⭐ | Research Workflow | M |
| DV-023 | [[DV-023 Шаблон синтеза → публикация|Шаблон синтеза и переход synthesis → publication]] | • | Research Workflow | M |
| DV-024 | [[DV-024 Интегрировать open_deep_research|Интегрировать open_deep_research как опцию роли researcher]] | · | Phase 2 | XL |
| DV-025 | [[DV-025 Twake Drive для тяжёлых медиа|Twake Drive для тяжёлых медиа -видео- PDF-]] | · | Phase 2 | L |
| DV-026 | [[DV-026 Resend верификация домена для magic-link|Resend- верифицировать re-search.wiki для magic-link email]] | ⭐ | Self-hosted Infra | XS |

## 🟢 Done (27)

| ID | Задача | Приоритет | Эпик | Объём |
|---|---|---|---|---|
| DV-001 | [[DV-001 Создать product-vision и архитектурные документы|Создать product-vision и архитектурные документы]] | 🔥 | Product Vision Docs | S |
| DV-002 | [[DV-002 Подключить dv-project как git submodule|Подключить dv-project как git submodule]] | 🔥 | Product Vision Docs | XS |
| DV-003 | [[DV-003 Настроить opencode.json|Настроить opencode.json]] | 🔥 | Product Vision Docs | S |
| DV-004 | [[DV-004 Создать промпты агентов opencode|Создать промпты агентов opencode -plan- build- reviewer- researcher-]] | 🔥 | Product Vision Docs | S |
| DV-005 | [[DV-005 Купить домен re-search.wiki|Купить домен re-search.wiki]] | 🔥 | Self-hosted Infra | XS |
| DV-006a | [[DV-006a Базовая настройка сервера (hardening + пакеты)|Базовая настройка сервера- SSH ключи- ufw- пакеты]] | 🔥 | Self-hosted Infra | S |
| DV-006 | [[DV-006 Купить VPS на Fornex (Germany)|Купить VPS на Fornex -Germany-]] | 🔥 | Self-hosted Infra | XS |
| DV-007 | [[DV-007 Мигрировать БД с D1|Мигрировать БД- Cloudflare D1 → SQLite-файл или Postgres]] | 🔥 | Self-hosted Infra | L |
| DV-008 | [[DV-008 Деплой dv-hub на VPS (Node adapter + PM2)|Деплой dv-hub- Hono Node adapter - PM2]] | 🔥 | Self-hosted Infra | M |
| DV-009 | [[DV-009 Бэкапы БД|Настроить ежедневные бэкапы БД с offsite-копией]] | ⭐ | Self-hosted Infra | S |
| DV-010 | [[DV-010 DNS-записи для re-search.wiki|DNS A-записи- @- www- meet → IP сервера]] | 🔥 | Self-hosted Infra | XS |
| DV-011 | [[DV-011 Развернуть MiroTalk SFU|Развернуть MiroTalk SFU на meet.re-search.wiki]] | 🔥 | Calls & Transcription | M |
| DV-013 | [[DV-013 Заменить Jitsi на MiroTalk в UI комнат|Заменить Jitsi на MiroTalk в UI комнат сайта]] | ⭐ | Conferencing | S |
| DV-019 | [[DV-019 Урезать роли до admin member guest|Урезать роли до admin-member-guest]] | ⭐ | Roles & Auth | S |
| DV-020 | [[DV-020 Telegram Login Widget|Решить судьбу Telegram Login Widget]] | • | Roles & Auth | S |
| DV-027 | [[DV-027 Nginx + Let's Encrypt для всех трёх доменов|Nginx reverse proxy - SSL для re-search.wiki- www- meet]] | 🔥 | Self-hosted Infra | S |
| DV-029 | [[DV-029 Infra Runbook|Создать docs-infra-runbook.md — операционный мануал по инфре]] | ⭐ | Self-hosted Infra | S |
| DV-031 | [[DV-031 Внутрихабовая почта Корабля (ship-mail)|Внутрихабовая почта Корабля -ship-mail- — пилот]] | ⭐ | Ship Mail | M |
| DV-032 | [[DV-032 Тесты и CI канона писем|ship-mail- тесты под канон писем - CI-материализация -PR 3-]] | ⭐ | Ship Mail | S |
| DV-033 | [[DV-033 Деплой MiroTalk 2.7.65|Деплой MiroTalk 2.7.65- фикс скрипта -PR 4-]] | 🔥 | Conferencing | M |
| DV-034 | [[DV-034 Contributor Artifacts зона|Зона Contributor Artifacts для контрибьюторов]] | • | Knowledge Base | XS |
| DV-035 | [[DV-035 Слой памяти idea-graph|Слой краткосрочной памяти- idea-graph ДВ-Хаб]] | ⭐ | Memory | M |
| DV-036 | [[DV-036 Транспорт симлинк на канон|Транспорт- копия заменена симлинком на канон]] | ⭐ | Infra Hygiene | XS |
| DV-037 | [[DV-037 Сторож CI GitHub Actions|Сторож CI- падения фиксируются автоматически]] | ⭐ | Infra Hygiene | S |
| DV-038 | [[DV-038 Сторож переезда systemd|Сторож переезда- таймеры systemd вместо cron]] | ⭐ | Self-hosted Infra | S |
| DV-039 | [[DV-039 Offsite-бэкап Tailscale|Offsite-бэкап- труба проверена живым архивом]] | ⭐ | Self-hosted Infra | S |
| DV-040 | [[DV-040 Агенты и канон цели|Агентский слой- восстановление файлов- шаги- канон цели]] | ⭐ | Agents | S |

