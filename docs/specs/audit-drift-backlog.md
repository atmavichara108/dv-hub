---
type: Execution Spec
title: dv-hub audit drift & security backlog — открытые пункты Phase D
project: dv-hub
status: partially-resolved
priority: P2
timestamp: 2026-09-24
---

# dv-hub audit drift & security backlog (Phase D)

> Свод открытых унаследованных пунктов аудита Phase D (2026-08-03), которые
> **dev-loop апгрейд 2026-09-15 не закрыл** и которые должны видеть и Pip-Boy
> (ECO-022), и dv-hub-агент. Часть пунктов уже снята апгрейдом — отмечено.

## Статус findings после апгрейда 2026-09-15

| Finding | Тип | Было (2026-08-03) | Статус now | Что осталось |
|---------|-----|-------------------|-----------|--------------|
| G-D-RUN-3 | methodology | `tests/` пуст, `npm test` exit 1, CI без тестов | **СНЯТ** | `tests/api.test.ts` (9), `--passWithNoTests`, CI=lint+typecheck+test+build |
| G-D-RUN-6 | methodology | CI excludes tests, `.github/` absent | **СНЯТ** | `.github/workflows/ci.yml` добавлен |
| G-D-DOC-2 | drift | README command table (5 vs 7) | **СНЯТ** | README переписан под фактический набор скриптов |
| G-D-DOC-4 | drift | Card log stale с 2026-06-30 | **СНЯТ** | `03-Projects/dv-hub.md` обновлён 2026-09-15 |
| G-D-DOC-5 | drift | Wrangler leftovers (3 файла) | **СНЯТ** | `wrangler.jsonc`/`example.toml` удалены; `wrangler.toml`+`.wrangler/` убраны из диска |
| G-D-DOC-1 | drift | compaction.ts «Zomro Poland» vs architecture «Fornex Germany» | **ОТКРЫТ** | уточнить целевой VPS-провайдер; править compaction.ts при подтверждении |
| G-D-DOC-3 | drift | VibeOS «6 агентов» vs факт 5 | **ОТКРЫТ** | актуализировать VibeOS.md |
| G-D-DOC-6 | drift | ecosystem-map node for dv-hub absent | **ОТКРЫТ** | есть ECO-022; проверить cart consistency в registry.json |
| G-D-RUN-1 | runtime | Telegram auth `getMe` 404 | **ОТКРЫТ** | runtime fix; зависим от живых данных и секретов (не репо) |
| G-D-RUN-2 | runtime | D1 migration data-incomplete | **ОТКРЫТ** | см. `data-recovery.md` (P1, blocked) |
| G-D-RUN-4 | runtime | hono ≤ 4.12.26 GHSA HTML-injection (candidate/unverified) | **ОТКРЫТ** | bump hono + confirm advisory; сейчас `hono ^4.12.9` |
| G-D-RUN-5 | runtime | @hono/node-server moderate vulns, no fix | **ОТКРЫТ** | monitor; нет фикса на момент аудита |
| G-D-RUN-7 | drift | dependency drift | **ОТКРЫТ** | run `npm outdated` / audit после финальной фиксации |
| G-D-METH-1/2 | methodology | verifier redesigned / reviewer half-pipeline | **ОТКРЫТ** | вынести verifier-loop как отдельный метод-апгрейд |
| G-D-METH-3 | methodology | memory-management 🟡 | **ОТКРЫТ** | compaction только injection; event-log/replay нет |
| G-D-METH-4 | methodology | context-as-docs 🟡 | **ОТКРЫТ** | формальный DoD задач не прописан |
| G-D-ECO-* | ecosystem | global nerve coupling 0, naming variance, loader risk | **ОТКРЫТ** | отдельная тема экосистемной интеграции, не dv-hub-сольная |

## Приоритет следующей dv-hub-сессии (после data-recovery)

1. `data-recovery.md` (P1, blocked) — пред-условие всего.
2. `G-D-RUN-4` (hono bump + advisory confirm) — единственный security candidate.
3. `G-D-RUN-7` (`npm audit`/`npm outdated`) — заморозить зависимости в CI.
4. `G-D-DOC-1` (VPS provider truth) — при подтверждении.

## Актуализация 2026-09-24

- Production dependency advisories устранены обновлением lockfile; `npm audit --omit=dev` = 0.
- README/AGENTS drift о current Cloudflare runtime устранён.
- Для работы без Telegram/Resend добавлена строго dev-only локальная авторизация.
- VPS больше не является текущим блокером: canonical baseline — localhost.
- Остаются browser E2E, Docker runtime smoke, offline CDN dependencies и recovery живых данных.

## Границы

- Это backlog-проекция, не автономный план вмешательства. Каждый пункт —
  отдельное решение с валидацией; не делать скопом.
- Security finding (G-D-RUN-4) до подтверждения advisory остаётся `candidate`,
  не выдавать за доказанный CVE.
