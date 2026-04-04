// ─────────────────────────────────────────────────────────────
// TOPICS — Канбан-доска с drag-and-drop
// ─────────────────────────────────────────────────────────────
// Drag-and-drop реализован на нативном HTML5 Drag API:
// - draggable="true" на карточке — разрешает перетаскивание
// - dragstart — запоминаем какую карточку взяли
// - dragover — разрешаем бросить в эту зону (preventDefault)
// - drop — обрабатываем: меняем статус темы через PATCH API
// - dragend — убираем визуальные подсказки
//
// Никаких внешних библиотек — чистый браузерный API.

const TOPIC_STATUSES = ['proposed','ripening','scheduled','in_discussion','synthesized','published','archive']

// ID темы, которую сейчас перетаскивают
let draggedTopicId = null

async function renderTopics(filter = '') {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const data = await get('/topics' + (filter ? `?status=${filter}` : ''))

  // Группировка по статусу для канбана
  const groups = {}
  TOPIC_STATUSES.forEach(s => groups[s] = [])
  data.forEach(t => { if (groups[t.status]) groups[t.status].push(t); else groups['proposed'].push(t) })

  const activeStatuses = filter ? [filter] : TOPIC_STATUSES.filter(s => s !== 'archive')

  app().innerHTML = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold text-ink-900">Доска тем</h1>
        <p class="text-ink-400 text-sm mt-1">Перетаскивайте карточки между колонками для смены статуса</p>
      </div>
      <div class="flex gap-2">
        <button onclick="toggleTopicView()" id="view-toggle-btn" class="border border-ink-200 text-ink-500 hover:border-ink-400 px-3 py-2 rounded-lg text-sm transition" title="Переключить вид">
          <i class="fas fa-list"></i>
        </button>
        <button onclick="addTopicModal()" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <i class="fas fa-plus mr-1.5"></i>Новая тема
        </button>
      </div>
    </div>

    <div class="flex gap-2 mb-5 flex-wrap">
      ${[['','Все'],['proposed','Предложены'],['ripening','Созревают'],['scheduled','Назначены'],['in_discussion','В обсуждении'],['synthesized','Синтез'],['published','В контент'],['archive','Архив']].map(([v,l]) =>
        `<button onclick="renderTopics('${v}')" class="text-xs px-3 py-1.5 rounded-full border transition ${filter===v ? 'bg-ink-800 text-white border-ink-800' : 'border-ink-200 text-ink-500 hover:border-ink-400'}">${l}</button>`
      ).join('')}
    </div>

    ${filter ? `
    <div class="space-y-2">
      ${(groups[filter] || []).length === 0 ? '<div class="text-center py-12 text-ink-300">Нет тем в этом статусе</div>' :
        (groups[filter] || []).map(t => topicCard(t, false)).join('')}
    </div>` : `
    <div id="kanban-board" class="overflow-x-auto pb-4 -mx-4 px-4">
      <div class="flex gap-3" style="min-width: max-content;">
        ${activeStatuses.map(s => `
          <div class="w-60 lg:w-72 xl:flex-1 xl:min-w-[200px] flex-shrink-0">
            <div class="flex items-center gap-2 mb-3 px-1">
              ${statusBadge(STATUS_TOPIC, s)}
              <span class="text-xs text-ink-400 font-medium">${groups[s].length}</span>
            </div>
            <div class="kanban-column min-h-[250px] bg-ink-50/50 rounded-xl p-2 border-2 border-dashed border-transparent transition-colors"
                 data-status="${s}"
                 ondragover="onDragOver(event)"
                 ondragleave="onDragLeave(event)"
                 ondrop="onDrop(event, '${s}')">
              ${groups[s].length === 0
                ? `<div class="kanban-empty text-xs text-ink-300 text-center py-8">Перетащите сюда</div>`
                : groups[s].map(t => topicCardDraggable(t)).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`}
  </div>`
}

// Карточка темы для канбана (с drag)
function topicCardDraggable(t) {
  const p = PRIORITY[t.priority] || PRIORITY.medium
  return `
  <div class="kanban-card bg-white rounded-lg p-3 shadow-sm border border-ink-100 mb-2 cursor-grab active:cursor-grabbing hover:border-accent-300 hover:shadow-md transition-all"
       draggable="true"
       data-topic-id="${t.id}"
       ondragstart="onDragStart(event, ${t.id})"
       ondragend="onDragEnd(event)">
    <a href="/topics/${t.id}" class="block text-sm font-medium text-ink-800 hover:text-accent-600 transition mb-1.5 leading-snug">${t.title}</a>
    ${t.question ? `<p class="text-xs text-ink-400 mb-2 line-clamp-2 leading-relaxed">${t.question}</p>` : ''}
    <div class="flex items-center justify-between text-xs text-ink-400">
      <span title="${p[0]}"><i class="fas fa-circle ${p[1]} mr-0.5 text-[8px]"></i>${p[0]}</span>
      <div class="flex gap-2">
        ${t.material_count ? `<span title="Материалы"><i class="fas fa-inbox mr-0.5"></i>${t.material_count}</span>` : ''}
        ${t.room_count ? `<span title="Дискуссии"><i class="fas fa-comments mr-0.5"></i>${t.room_count}</span>` : ''}
      </div>
    </div>
    ${tags(t.tags) ? `<div class="mt-1.5">${tags(t.tags)}</div>` : ''}
  </div>`
}

// Карточка темы для списка (без drag)
function topicCard(t, compact = false) {
  const p = PRIORITY[t.priority] || PRIORITY.medium
  return `
  <a href="/topics/${t.id}" class="block bg-white rounded-xl p-4 shadow-sm border border-ink-100 hover:border-accent-300 transition group">
    <div class="flex items-start justify-between gap-2 mb-2">
      <span class="text-sm font-medium text-ink-800 group-hover:text-accent-600 transition">${t.title}</span>
      ${compact ? '' : statusBadge(STATUS_TOPIC, t.status)}
    </div>
    ${t.question && !compact ? `<p class="text-xs text-ink-400 mb-2 line-clamp-2">${t.question}</p>` : ''}
    <div class="flex items-center justify-between text-xs text-ink-400 flex-wrap gap-1">
      <span><i class="fas fa-circle ${p[1]} mr-1"></i>${p[0]}</span>
      <div class="flex gap-2">
        ${t.material_count ? `<span><i class="fas fa-inbox mr-1"></i>${t.material_count}</span>` : ''}
        ${t.room_count ? `<span><i class="fas fa-comments mr-1"></i>${t.room_count}</span>` : ''}
      </div>
    </div>
    ${tags(t.tags)}
  </a>`
}

// ── Drag-and-drop обработчики ─────────────────────────────────

function onDragStart(event, topicId) {
  draggedTopicId = topicId
  // Данные для Firefox (требует setData для работы drag)
  event.dataTransfer.setData('text/plain', topicId)
  event.dataTransfer.effectAllowed = 'move'
  // Подсвечиваем карточку как перетаскиваемую
  setTimeout(() => {
    event.target.classList.add('opacity-40', 'scale-95')
  }, 0)
}

function onDragEnd(event) {
  draggedTopicId = null
  event.target.classList.remove('opacity-40', 'scale-95')
  // Убираем подсветку со всех колонок
  document.querySelectorAll('.kanban-column').forEach(col => {
    col.classList.remove('border-accent-400', 'bg-accent-400/5')
    col.classList.add('border-transparent')
  })
}

function onDragOver(event) {
  event.preventDefault()  // Обязательно — без этого drop не сработает
  event.dataTransfer.dropEffect = 'move'
  // Подсвечиваем колонку куда тащим
  const col = event.currentTarget
  col.classList.add('border-accent-400', 'bg-accent-400/5')
  col.classList.remove('border-transparent')
}

function onDragLeave(event) {
  const col = event.currentTarget
  col.classList.remove('border-accent-400', 'bg-accent-400/5')
  col.classList.add('border-transparent')
}

async function onDrop(event, newStatus) {
  event.preventDefault()
  const col = event.currentTarget
  col.classList.remove('border-accent-400', 'bg-accent-400/5')
  col.classList.add('border-transparent')

  if (!draggedTopicId) return

  const topicId = draggedTopicId
  draggedTopicId = null

  try {
    await patch(`/topics/${topicId}`, { status: newStatus })
    toast(`Статус изменён → ${STATUS_TOPIC[newStatus]?.[0] || newStatus}`)
    renderTopics()  // Перерисовываем доску
  } catch (e) {
    toast('Ошибка обновления статуса', 'error')
  }
}

// Переключение вид: канбан ↔ список
let topicViewMode = 'kanban'

function toggleTopicView() {
  topicViewMode = topicViewMode === 'kanban' ? 'list' : 'kanban'
  const btn = document.getElementById('view-toggle-btn')
  if (btn) btn.innerHTML = topicViewMode === 'kanban' ? '<i class="fas fa-list"></i>' : '<i class="fas fa-columns"></i>'

  if (topicViewMode === 'list') {
    renderTopicsList()
  } else {
    renderTopics()
  }
}

async function renderTopicsList() {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const data = await get('/topics')

  app().innerHTML = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold text-ink-900">Доска тем</h1>
        <p class="text-ink-400 text-sm mt-1">Все темы списком</p>
      </div>
      <div class="flex gap-2">
        <button onclick="toggleTopicView()" id="view-toggle-btn" class="border border-ink-200 text-ink-500 hover:border-ink-400 px-3 py-2 rounded-lg text-sm transition" title="Переключить вид">
          <i class="fas fa-columns"></i>
        </button>
        <button onclick="addTopicModal()" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <i class="fas fa-plus mr-1.5"></i>Новая тема
        </button>
      </div>
    </div>
    ${data.length === 0 ? '<div class="text-center py-16 text-ink-300"><i class="fas fa-layer-group text-4xl mb-3 block"></i>Нет тем</div>' : `
    <div class="space-y-2">
      ${data.map(t => topicCard(t, false)).join('')}
    </div>`}
  </div>`
}

// ── Модалки тем (создание, детали, редактирование) ────────────

function addTopicModal() {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Новая тема</h3>
    <form id="topic-form" class="space-y-3">
      <div>
        <label class="block text-xs text-ink-500 mb-1">Название *</label>
        <input name="title" required class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Главный вопрос</label>
        <input name="question" placeholder="На который ищем ответ..." class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-ink-500 mb-1">Приоритет</label>
          <select name="priority" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
            <option value="low">Низкий</option>
            <option value="medium" selected>Средний</option>
            <option value="high">Высокий</option>
            <option value="urgent">Срочный</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-ink-500 mb-1">Публичная?</label>
          <select name="is_public" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
            <option value="0">Приватная</option>
            <option value="1">Публичная</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Теги (через запятую)</label>
        <input name="tags" placeholder="тег1, тег2" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Создать</button>
      </div>
    </form>
  </div>`)


  $('#topic-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const tagsRaw = fd.get('tags')
    try {
      await post('/topics', {
        title: fd.get('title'),
        question: fd.get('question') || undefined,
        thesis: fd.get('thesis') || undefined,
        antithesis: fd.get('antithesis') || undefined,
        priority: fd.get('priority'),
        tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
        is_public: parseInt(fd.get('is_public')),
        owner_id: currentUser ? currentUser.id : null
      })
      closeModal(); toast('Тема создана')
      renderTopics()
    } catch (err) {
      toast('Ошибка: ' + (err.response?.data?.error || err.message), 'error')
    }
  })
  // $('#topic-form')?.addEventListener('submit', async e => {
  //   e.preventDefault()
  //   const fd = new FormData(e.target)
  //   const tagsArr = (fd.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean)
  //   await post('/topics', {
  //     title: fd.get('title'), question: fd.get('question') || undefined,
  //     priority: fd.get('priority'), is_public: parseInt(fd.get('is_public')), tags: tagsArr
  //   })
  //   closeModal(); toast('Тема создана')
  //   renderTopics()
  // })
}

async function renderTopicDetail(id) {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const t = await get(`/topics/${id}`)
  app().innerHTML = `
  <div class="fade-in">
    <div class="mb-4">
      <a href="/topics" class="text-sm text-ink-400 hover:text-accent-500"><i class="fas fa-arrow-left mr-1"></i>Все темы</a>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-6 mb-6">
      <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
        <h1 class="text-xl font-semibold text-ink-900 flex-1">${t.title}</h1>
        <div class="flex items-center gap-2">
          ${statusBadge(STATUS_TOPIC, t.status)}
          <button onclick="changeTopicStatus(${t.id}, '${t.status}')" class="text-xs text-ink-400 hover:text-ink-700 px-2 py-1 rounded border border-ink-200 hover:border-ink-400 transition">
            Изменить
          </button>

          ${currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator') ? `
          <button onclick="deleteTopic(${t.id})" class="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-red-200 hover:border-red-400 transition">
            <i class="fas fa-trash"></i>
          </button>` : ''}
        </div>
      </div>

      ${t.question ? `<div class="mb-4 p-3 bg-ink-50 rounded-lg"><p class="text-sm text-ink-500 font-medium mb-1">Главный вопрос</p><p class="text-ink-800">${t.question}</p></div>` : ''}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p class="text-xs font-medium text-blue-600 mb-2">Тезис</p>
          ${t.thesis ? `<p class="text-sm text-ink-800">${t.thesis}</p><button onclick="editField(${t.id},'thesis','Тезис','${encodeURIComponent(t.thesis)}')" class="text-xs text-blue-400 hover:underline mt-1">редактировать</button>` : `<button onclick="editField(${t.id},'thesis','Тезис','')" class="text-xs text-blue-400 hover:underline">+ Добавить тезис</button>`}
        </div>
        <div class="p-3 bg-orange-50 rounded-lg border border-orange-100">
          <p class="text-xs font-medium text-orange-600 mb-2">Антитезис</p>
          ${t.antithesis ? `<p class="text-sm text-ink-800">${t.antithesis}</p><button onclick="editField(${t.id},'antithesis','Антитезис','${encodeURIComponent(t.antithesis)}')" class="text-xs text-orange-400 hover:underline mt-1">редактировать</button>` : `<button onclick="editField(${t.id},'antithesis','Антитезис','')" class="text-xs text-orange-400 hover:underline">+ Добавить антитезис</button>`}
        </div>
      </div>

      ${t.synthesis ? `
      <div class="p-4 bg-accent-400/10 rounded-lg border border-accent-400/30 mb-4">
        <p class="text-xs font-medium text-accent-600 mb-2"><i class="fas fa-star mr-1"></i>Синтез</p>
        <p class="text-sm text-ink-800">${t.synthesis}</p>
        <button onclick="editField(${t.id},'synthesis','Синтез','${encodeURIComponent(t.synthesis)}')" class="text-xs text-accent-500 hover:underline mt-1">редактировать</button>
      </div>` : `
      <button onclick="editField(${t.id},'synthesis','Синтез','')" class="text-xs text-accent-500 hover:underline mb-4 block">+ Добавить синтез</button>`}

      <div class="flex items-center gap-4 text-xs text-ink-400">
        <span>${PRIORITY[t.priority]?.[0] || 'Средний'} приоритет</span>
        <span>${t.owner_name ? '↳ ' + t.owner_name : ''}</span>
        <span>${fdate(t.updated_at)}</span>
        ${t.is_public ? '<span class="text-accent-500"><i class="fas fa-globe mr-1"></i>Публичная</span>' : '<span><i class="fas fa-lock mr-1"></i>Приватная</span>'}
      </div>
      ${tags(t.tags)}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-medium text-ink-700"><i class="fas fa-inbox mr-2 text-rust-400"></i>Материалы (${t.materials.length})</h2>
        </div>
        ${t.materials.length ? t.materials.map(m => `
          <div class="bg-white rounded-lg p-3 border border-ink-100 mb-2 text-sm">
            <div class="flex items-start justify-between gap-2">
              <span class="font-medium">${m.url ? `<a href="${m.url}" target="_blank" class="hover:text-accent-600">${m.title}</a>` : m.title}</span>
              ${statusBadge(STATUS_MATERIAL, m.status)}
            </div>
            ${m.description ? `<p class="text-xs text-ink-400 mt-1">${m.description}</p>` : ''}
          </div>`).join('') : '<p class="text-sm text-ink-400">Нет привязанных материалов</p>'}
      </div>

      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-medium text-ink-700"><i class="fas fa-comments mr-2 text-purple-400"></i>Дискуссии (${t.rooms.length})</h2>
          <button onclick="createRoomForTopic(${t.id}, '${t.title.replace(/'/g,"\\'")}');" class="text-xs text-accent-500 hover:underline">+ Создать</button>
        </div>
        ${t.rooms.map(r => `
          <a href="/rooms/${r.id}" class="block bg-white rounded-lg p-3 border border-ink-100 mb-2 hover:border-accent-300 transition">
            <div class="text-sm font-medium">${r.title}</div>
            <div class="text-xs text-ink-400 mt-1">${statusBadge(STATUS_ROOM, r.status)} ${r.scheduled_at ? fdate(r.scheduled_at) : ''}</div>
          </a>`).join('') || '<p class="text-sm text-ink-400">Нет дискуссий</p>'}

        <div class="mt-4 flex items-center justify-between mb-3">
          <h2 class="font-medium text-ink-700"><i class="fas fa-play-circle mr-2 text-red-400"></i>Медиа (${t.publications.length})</h2>
        </div>
        ${t.publications.map(p => `
          <a href="${p.url}" target="_blank" class="block bg-white rounded-lg p-3 border border-ink-100 mb-2 hover:border-accent-300 transition">
            <div class="text-sm font-medium truncate">${p.title}</div>
            <div class="text-xs text-ink-400 mt-1">${p.platform}</div>
          </a>`).join('') || '<p class="text-sm text-ink-400">Нет публикаций</p>'}
      </div>
    </div>
  </div>`
}

function changeTopicStatus(id, current) {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Изменить статус темы</h3>
    <div class="space-y-2">
      ${TOPIC_STATUSES.map(s => `
        <button onclick="setTopicStatus(${id},'${s}')" class="w-full text-left px-4 py-2.5 rounded-lg border transition flex items-center justify-between ${s===current ? 'border-accent-400 bg-accent-400/10' : 'border-ink-200 hover:border-ink-300'}">
          ${statusBadge(STATUS_TOPIC, s)}
          ${s===current ? '<i class="fas fa-check text-accent-500"></i>' : ''}
        </button>`).join('')}
    </div>
  </div>`)
}

async function setTopicStatus(id, status) {
  await patch(`/topics/${id}`, { status })
  closeModal(); toast('Статус обновлён')
  renderTopicDetail(id)
}

function editField(id, field, label, currentVal = '') {
  const decoded = currentVal ? decodeURIComponent(currentVal) : ''
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Редактировать: ${label}</h3>
    <form id="field-form" class="space-y-3">
      <textarea name="value" rows="4" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400 resize-none" placeholder="${label}...">${decoded}</textarea>
      <div class="flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Сохранить</button>
      </div>
    </form>
  </div>`)
  $('#field-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const val = new FormData(e.target).get('value')
    await patch(`/topics/${id}`, { [field]: val })
    closeModal(); toast(`${label} сохранён`)
    renderTopicDetail(id)
  })
}

function createRoomForTopic(topicId, topicTitle) {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-2">Создать комнату дискуссии</h3>
    <p class="text-sm text-ink-400 mb-4">Тема: ${topicTitle}</p>
    <form id="room-topic-form" class="space-y-3">
      <div>
        <label class="block text-xs text-ink-500 mb-1">Название комнаты *</label>
        <input name="title" required value="${topicTitle} — обсуждение" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Описание</label>
        <textarea name="description" rows="2" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400 resize-none"></textarea>
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Дата и время</label>
        <input name="scheduled_at" type="datetime-local" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Создать</button>
      </div>
    </form>
  </div>`)

  $('#room-topic-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    await post('/rooms', {
      topic_id: topicId, title: fd.get('title'),
      description: fd.get('description') || undefined,
      scheduled_at: fd.get('scheduled_at') || undefined,
      created_by: currentUser ? currentUser.id : null
    })
    closeModal(); toast('Комната создана')
    renderTopicDetail(topicId)
  })
}

function deleteTopic(id) {
  confirmDelete('Тема, все связанные дискуссии и публикации будут удалены. Материалы отвяжутся.', async () => {
    try {
      await del(`/topics/${id}`)
      toast('Тема удалена')
      navigate('/topics')
    } catch (err) {
      toast('Ошибка удаления', 'error')
    }
  })
}
