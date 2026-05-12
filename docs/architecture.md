
# Architecture Decisions

## ADR-001: Self-hosted infrastructure on Zomro VPS
**Контекст**: Cloudflare заблокирован в РФ; данные дискуссий чувствительны; нужна предсказуемая стоимость.

**Решение**: VPS Zomro Standard Intel (2 vCPU / 5 GB RAM / 35 GB NVMe), регион Poland, Ubuntu 22.04. Домен re-search.wiki в Namecheap. Reverse proxy — Nginx. Процесс-менеджер — PM2. SSL — Let's Encrypt через certbot (snap).

**Отвергнутые варианты**:
- Cloudflare Workers + D1: блокировки в РФ, vendor lock-in.
- Docker compose: лишний слой сложности для одной машины и двух Node-сервисов.
- Caddy: проще конфиг, но Nginx у команды известен лучше; tradeoff в пользу узнаваемости.

**Последствия**:
- Бэкапы делаем сами (см. DV-009).
- Миграция D1 → SQLite (better-sqlite3) или libSQL (см. DV-007).
- Мониторинг — пока pm2 + ручные проверки; алёрты позже.

## ADR-002: Видеосвязь — MiroTalk SFU
**Контекст**: Jitsi публичный, есть ограничения; нужен self-host с минимумом зависимостей и совместимостью с mediasoup.

**Решение**: MiroTalk SFU на поддомене `meet.re-search.wiki`, порт 3010 за Nginx reverse proxy. Порты медиа 40000-40100 tcp+udp открыты в ufw. STUN — публичный Google пока, coturn (TURN) — только при проблемах со связностью (см. ADR-007).

**Последствия**:
- Memory footprint mediasoup ощутимый: при 20+ участниках 5 GB RAM впритык.
- C2C-вариант MiroTalk оставлен на будущее как fallback для пар.

## ADR-003: Транскрибация — Meetily (фаза 2)
**Контекст**: транскрипты дискуссий не должны утекать в третьи руки; нужна возможность работать в офлайне.

**Решение**: Meetily (Whisper + Ollama) запускается на том же VPS или отдельной машине с GPU при росте нагрузки. На MVP — CPU-инференс через whisper.cpp (small/base модель).

**Последствия**:
- Очередь обработки записей асинхронная.
- Запись → транскрипт → черновик синтеза — пайплайн в DV-015.

## ADR-004: Storage тяжёлых медиа — Twake Drive (фаза 2)
**Контекст**: PDF/видео/аудио в SQLite не положишь; локальная файловая система = риск переполнения диска (35 GB).

**Решение**: Twake Drive на отдельном поддомене `drive.re-search.wiki` для бинарных артефактов. В материалах храним только ссылки. На MVP — папка `/opt/dv-hub/uploads/` с лимитом размера.

**Последствия**: ещё один self-hosted сервис + SSO в перспективе.

## ADR-005: Чат участников — отложено
**Контекст**: соблазн взять Element/Matrix.

**Решение**: остаёмся на чате внутри room (SQLite). Matrix только если появится потребность в персистентном комьюнити-чате вне комнат.

**Обоснование**: преждевременная инфраструктура = trap. Telegram уже выполняет роль внешнего чата.

## ADR-006: AI Research Assistant — open_deep_research (фаза 2)
**Контекст**: при подготовке темы нужен сбор источников.

**Решение**: open_deep_research как отдельный сервис, доступен роли admin/member по кнопке «Углубить тему». Поиск — через MCP-searxng (self-hosted SearXNG), чтобы не светить запросы в Google.

**Последствия**: ещё один сервис + LLM API key (OpenAI/Anthropic/локальный Ollama).

## ADR-007: TURN-сервер (coturn) — по факту
**Контекст**: пользователи за симметричным NAT могут не подключиться к MiroTalk SFU без TURN.

**Решение**: не разворачивать упреждающе. Запускаем coturn только если в DV-011 будут реальные жалобы на связь.

**Последствия**: рискуем плохим UX на первых созвонах; компенсируем быстрым реагированием.

## ADR-008: Authentication — Telegram + magic-link
**Контекст**: пользователи движения в основном в Telegram; email как fallback.

**Решение**: Telegram Login Widget (primary), email magic-link через Resend с верифицированным re-search.wiki (fallback). Сессии — HTTP-only cookie + sessions table в БД.

**Последствия**: зависимость от Resend (free tier 100 писем/день — пока хватит); Telegram Login Widget требует HTTPS и публичный домен (✓).
