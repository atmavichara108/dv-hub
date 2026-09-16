---
description: Прочитать canonical execution spec dv-hub (локально)
agent: plan
---

Локальный wrapper для `/spec`. Selector: $ARGUMENTS

Прочитай локальные `AGENTS.md` и `README.md`, затем используй canonical
location **этого репозитория**:
`/home/rudra/Projects/dv-hub/docs/specs/`.

Если selector не указан, покажи доступные specs из `docs/specs/` и инструкцию
вызвать `/spec <selector>`. Specs исполняет dv-hub-агент, поэтому они живут
здесь (локально), а не в Vault. Не создавай конкурирующую копию.

Старый task-planning workflow из `context/DV/Operations/Kanban/Tasks/` и ADR
может быть использован только после чтения canonical spec и только как входные
материалы; этот wrapper не создаёт новую execution spec.