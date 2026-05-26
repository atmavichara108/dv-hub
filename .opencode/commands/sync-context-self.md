
---
description: Синхронизировать submodule context с remote
---

# Sync context submodule

Текущее состояние:

!`cd ~/Projects/dv-hub && npm run context:status`

Подтянуть изменения и показать diff:

!`cd ~/Projects/dv-hub/context && git pull origin main`

!`cd ~/Projects/dv-hub && git diff context`

После просмотра diff, если всё ок — выполни вручную в терминале:

```bash
cd ~/Projects/dv-hub
npm run context:bump
git push
```

Bump и push НЕ автоматизированы намеренно — это последняя проверка перед записью SHA в dv-hub.
