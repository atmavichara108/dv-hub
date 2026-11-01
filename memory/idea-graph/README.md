# idea-graph ДВ-Хаб

Слой краткосрочной памяти проекта ДВ-Хаб — по образцу корабельного idea-graph
(Вельзевул Layer): три JSONL-файла, append-only.

- `nodes.jsonl` — узлы: `{id, graph, kind, label, status, provenance, projection}`
- `edges.jsonl` — рёбра: `{id, graph, from, to, type, status, provenance, projection}`
- `protocol.jsonl` — протокольные правила: `{id, kind, status, rule, provenance}`

Графы: `world` (мир/движение), `organ` (ведомства/люди), `mech` (механики
проекта), `tech` (решения/инфра), `proto` (правила), `event` (факты-события),
`quest` (задачи), `stream` (сырой поток сессий).

Статусы узла: `raw` → `candidate` → `accepted` (канон — через Смотрителя и
слово владельца; `rejected`/`archived` — без удаления строк).

Provenance: `basis: quoted` — дословные слова владельца; `derived` — выведено;
`observed` — наблюдение факта. Домысел помечать явно.

Дисциплина: только дописывание в конец файла; правка строки = новая строка со
ссылки на старую; удаление — никогда (архивные эпохи — отдельными файлами).
