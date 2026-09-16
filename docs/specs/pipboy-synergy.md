---
type: Execution Spec
title: dv-hub ↔ Pip-Boy synergy — совместная разработка
project: dv-hub
status: active
timestamp: 2026-09-15
---

# dv-hub ↔ Pip-Boy synergy — контракт совместной разработки

> Пользователь ведёт дальнейшие апгрейды dv-hub **из Pip-Boy** (универсальный
> инструмент вайбкодинга, развиваемый параллельной сессией). Этот spec — контракт
> о том, как dv-hub-работа вписывается в Pip-Boy и не конфликтует с ним.

## Контекст

- Pip-Boy = `tools/ecosystem-map/` в Vault: canonical `registry.json` (карточки
  ECO-XXX), deterministic `observer.py` snapshot, `actions.py`, on-demand host
  `pipboy.py` (`http://127.0.0.1:8123/`), UI `index-v10.html`.
- dv-hub представлен в реестре карточкой **ECO-022** («dv-hub recovery gate»,
  Phase 4). Эта карточка — часть Pip-Boy-Kanban, ведётся Pip-Boy-сессией,
  **не** этим каталогом.
- dv-hub как репозиторий — отдельный локальный проект со своим opencode.

## Разделение владения

| Что | Владелец | Где править |
|-----|----------|-------------|
| Execution specs dv-hub | dv-hub-агент (build/plan/infra) | `docs/specs/` в этом репо |
| Код, миграции, CI dv-hub | dv-hub-агент (build/plan/infra) | `/home/rudra/Projects/dv-hub` |
| Карточка ECO-022 и Kanban-состояние | Pip-Boy-сессия | `tools/ecosystem-map/registry.json` (Vault) |
| Проектная карточка-сводка | librarian | `03-Projects/dv-hub.md` (Vault) |

## Правила синергии

1. **Один источник спеки (локально):** dv-hub-агент до изменения кода читает
   `docs/specs/<spec>.md` в этом репозитории; правки execution spec — только
   здесь, не в Vault.
2. **Пип-бой — окно, не источник правды по данным:** его Kanban/карточки —
   проекция `registry.json` (Vault); состояние dv-hub-кода фиксируется в этом
   каталоге и в `03-Projects/dv-hub.md` (Vault), а не в сообщениях пинбоя.
3. **Не манипулировать registry.json из dv-hub-сессии** без явного поручения:
   Kanban-состояние ECO-022 ведёт Pip-Boy (или librarian через decision-queue).
4. **Данные-восстановление — пред-условие:** `data-recovery.md` стоит раньше любых
   kernel/Kanban-апгрейдов dv-hub; Pip-Boy не должен помечать dv-hub «ready» до
   решения этого вопроса.
5. **Деплой-граница:** dv-hub-инфра (VPS/PM2/Nginx) — компетенция dv-hub `infra`,
   не Pip-Boy; Pip-Boy отображает, не оркестрирует деплой.

## Что делать Pip-Boy-сессии при старте dv-hub-работы

1. Прочитать `docs/specs/README.md` (baseline).
2. Определить, `data-recovery.md` всё ещё `blocked` — если да, это первый шаг.
3. Загрузить профиль permission/agent из `/home/rudra/Projects/dv-hub/opencode.json`
   (агенты plan/build/reviewer/researcher/infra, роли по моделям).
4. Дальше — через локальный `/spec <selector>` из dv-hub-репозитория, который
   резолвит спеки из `docs/specs/` этого репо.

## Открытые вопросы (на потом)

- Нужно ли Ecu-карточке ECO-022 обновить `status_note` (там ещё «tests пусты»,
  «Telegram auth 404» — апгрейд dev-loop частично это закрыл). Обновление —
  отдельное решение Pip-Boy/librarian, не dv-hub.