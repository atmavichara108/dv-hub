
---
description: Прочитать canonical execution spec из Vault для текущего проекта
agent: plan
---

Это pointer-compatible local wrapper для глобального `/spec`. Selector: $ARGUMENTS

Сначала прочитай локальные `AGENTS.md` и `README.md`, затем используй только
canonical Vault location:
`/home/rudra/Projects/OpenCode-Vault/06-Specs/dv-hub/`.

Если selector не указан, покажи доступные canonical specs для dv-hub и инструкцию
вызвать `/spec <selector>`. Не создавай локальную копию и не используй случайные
`context/` или `docs/` specs как fallback. Если Vault недоступен, остановись с
`BLOCKED` и точной причиной.

Старый task-planning workflow из `context/DV/Operations/Kanban/Tasks/` и ADR
может быть использован только после чтения canonical spec и только как входные
материалы; этот wrapper не создаёт новую конкурирующую execution spec.
