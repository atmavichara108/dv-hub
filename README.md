# DV Hub — Дискуссионные Вечера

Самохостимая исследовательская платформа для интеллектуальных дискуссий: от сбора материалов до синтеза результатов.

**Текущий продакшен:** [dv-hub.pages.dev](https://dv-hub.pages.dev) (Cloudflare Pages, миграция в процессе)
**Целевой продакшен:** re-search.wiki (self-hosted VPS, Phase 0)

**Стек (target):** Hono + TypeScript · Node.js + PM2 · Nginx · SQLite · Vanilla JS + Tailwind
**Стек (current):** Hono + TypeScript · Cloudflare Workers/Pages · D1 (SQLite) · Vanilla JS + Tailwind

> ⚠️ Проект в активной миграции с Cloudflare на собственную инфраструктуру. См. [docs/roadmap.md](docs/roadmap.md) и [docs/architecture.md](docs/architecture.md).

---

## Что это

Операционная система для распределённой команды, которая исследует темы, проводит дискуссии и публикует результаты. Не лендинг. Рабочий инструмент.

Цикл работы: **материал → тема → дискуссия → синтез → публикация**.

Подробное product vision — [docs/product-vision.md](docs/product-vision.md).

---

## Документация

| Файл | О чём |
|------|-------|
| [docs/product-vision.md](docs/product-vision.md) | Что такое DV Hub, для кого, что anti-goals |
| [docs/architecture.md](docs/architecture.md) | ADR — ключевые архитектурные решения |
| [docs/roadmap.md](docs/roadmap.md) | Фазы развития |
| [docs/glossary.md](docs/glossary.md) | Термины: ячейка, синтез, S3, consent |
| [docs/infra-runbook.md](docs/infra-runbook.md) | Операционный мануал по серверу (Phase 0+) |
| [AGENTS.md](AGENTS.md) | Конвенции для AI-агентов и контрибьюторов |

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

Заметка по комнатам: сейчас используется Jitsi (публичный), идёт миграция на self-hosted MiroTalk SFU на `meet.re-search.wiki`. См. ADR-002.

---

## Установка для разработки

### Требования
- Node.js 20 или 22
- npm 10+
- git с поддержкой submodules

### Клонирование

```bash
git clone --recurse-submodules https://github.com/atmavichara108/dv-hub.git
cd dv-hub
npm install
```

Если уже клонировал без `--recurse-submodules`:
```bash
git submodule update --init --recursive
# или
npm run context:init
```

### Submodule `context/`

`context/` — это git submodule на репо [dv-project](https://github.com/atmavichara108/dv-project) с операционным контекстом движения (vision, принципы, структура, бэклог задач). Используется AI-агентами и контрибьюторами для понимания продуктовых решений.

Работа с submodule:
```bash
npm run context:sync     # подтянуть последние изменения из dv-project
npm run context:bump     # зафиксировать новый sha в dv-hub
npm run context:status   # посмотреть состояние submodule
npm run context:log      # последние коммиты submodule
```

Подробнее о submodule см. секцию [«Submodule и его подводные камни»](#submodule-и-его-подводные-камни) ниже.

### Запуск (текущий, на Cloudflare)

```bash
npm run db:migrate:local
npm run db:seed
npm run dev:sandbox       # http://localhost:3000
```

Сброс БД: `npm run db:reset`.

### Запуск (target, Node.js — после DV-008)
TBD после миграции с D1.

---

## Тестирование

```bash
npm run test    # Jest
npm run lint    # ESLint
npm run build   # Vite
npm run ci      # lint + test + build
```

---

## AI-агенты (opencode)

Проект использует [opencode](https://opencode.ai/) для AI-ассистированной разработки. Конфигурация — в `opencode.json` и `.opencode/`.

Доступные агенты:
- **plan** — стратег, read-only по коду, может править docs и задачи
- **build** — исполнитель, пишет код по спекам
- **reviewer** — код-ревью (subagent, `@reviewer`)
- **researcher** — tech spike по внешним инструментам (`@researcher`)
- **infra** — операции на сервере re-search.wiki

Запуск: `opencode` в корне репо.

### Структура

    .opencode/
    ├─ agents/          # Определения ролей агентов
    │  ├─ plan.md       # Стратег (архитектура, ADR, без кода)
    │  ├─ build.md      # Исполнитель (пишет код по спеке)
    │  ├─ reviewer.md   # Ревью кода (read-only)
    │  ├─ researcher.md # Тех-разведка, анализ рисков
    │  └─ infra.md      # DevOps (сервер, Nginx, PM2)
    ├─ commands/        # Кастомные slash-команды
    │  ├─ morning.md    # /morning — дневной статус
    │  ├─ spec.md       # /spec <TASK-ID> — генерация спеки
    │  ├─ review.md     # /review — проверка перед мержем
    │  ├─ sync-context.md  # /sync-context — синк submodule
    │  └─ hygiene.md    # /hygiene — еженедельная уборка
    ├─ plugins/         # Lifecycle-плагины (env-guard, notify, compaction)
    └─ package.json     # Зависимости плагинов

## Постоянная память (опционально)
Для памяти между сессиями рекомендуем claude-mem:

```bash
npx claude-mem install --ide opencode
```
Хранит наблюдения в локальной SQLite + Chroma vector DB, отдаёт через MCP. Полезно, когда сессии превышают окно контекста или нужно, чтобы агенты помнили решения, принятые недели назад.
---

## Вклад в проект

Хочешь помочь? Прочитай в таком порядке:

1. [docs/product-vision.md](docs/product-vision.md) — поймёшь, что мы строим и что точно не строим.
2. [docs/architecture.md](docs/architecture.md) — что уже решено, что не обсуждается без ADR.
3. [docs/roadmap.md](docs/roadmap.md) — где мы сейчас и куда идём.
4. [AGENTS.md](AGENTS.md) — кодстайл и конвенции.
5. `context/DV/Operations/Kanban/Backlog.base` (откроется в Obsidian) или просто `ls context/DV/Operations/Kanban/Tasks/` — текущий бэклог.

### Работа без opencode

Конфиг агентов привязан к opencode, но **сам проект** — обычный TypeScript-репо. Можно работать с любым AI-кодером (Cursor, Claude Code, Aider, Continue.dev и т.д.) или без AI вообще.

Контекст для других инструментов:
- **Cursor**: создай `.cursorrules` со ссылками на `docs/*.md` и `AGENTS.md`. Содержание `.opencode/agents/build.md` можно скопировать как основу.
- **Claude Code**: читает `CLAUDE.md` или `AGENTS.md` автоматически. Наш `AGENTS.md` совместим.
- **Aider**: используй `.aider.conf.yml` и подключи docs/ как read-only context через `--read docs/architecture.md` и т.д.
- **Без AI**: просто читай `docs/` и AGENTS.md перед PR.

Ключевой принцип: **источник истины — docs/ и context/, а не конфиги AI-инструментов**. Любой контрибьютор должен получить одинаковое понимание из одних и тех же markdown-файлов.

### Pull Requests

- Маленькие PR, по одной теме на PR.
- Коммиты на английском, формат `feat:`/`fix:`/`chore:`/`refactor:`/`docs:`.
- Если меняешь архитектуру — сначала ADR в `docs/architecture.md`, обсуждение, потом код.
- Перед PR: `npm run ci` должен пройти.

---

## Submodule и его подводные камни

`context/` — отдельный git-репозиторий, прицепленный к dv-hub по конкретному коммиту (SHA). Это **не папка с файлами**, а указатель.

**Что это значит на практике:**

1. Когда ты или агент **редактирует файл внутри `context/`**, изменения идут в репо **dv-project**, а не в dv-hub. В dv-hub нужно отдельно «зафиксировать новый указатель».

2. Стандартный flow при правках в context:
   ```bash
   cd context
   # отредактировал DV/Operations/Kanban/Tasks/DV-008.md
   git add DV/Operations/Kanban/Tasks/DV-008.md
   git commit -m "task(DV-008): уточнить definition of done"
   git push origin main           # ← коммит ушёл в dv-project
   cd ..
   git add context                # ← теперь в dv-hub
   git commit -m "chore: bump context"
   git push origin main           # ← новый указатель в dv-hub
   ```

3. **Если забыть `git push` в dv-hub** — у тебя на машине всё ок, но у других участников и в CI submodule останется на старом sha. Они увидят прежнюю версию задачи. Через неделю все запутаются «почему у меня по-другому».

4. Чтобы обнаружить рассинхрон:
   ```bash
   npm run context:status
   ```
   Если показывает `modified content` или `new commits` — submodule впереди/позади указателя в dv-hub.

5. **Не редактируй файлы в `context/` если ты не уверен, что хочешь закоммитить в dv-project**. По умолчанию относись к нему как к read-only.

---

## Лицензия

AGPL-3.0. Производные работы, включая сетевые сервисы, должны оставаться открытыми под той же лицензией.

---

DV Hub · 2026
