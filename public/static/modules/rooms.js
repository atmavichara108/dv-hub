
// ─────────────────────────────────────────────────────────────
// ROOMS — Комнаты дискуссий
// ─────────────────────────────────────────────────────────────
// Комната — это не чат, а пространство конкретного обсуждения.
// Три режима жизни: подготовка → активная дискуссия → завершена.
// На странице комнаты: мета-информация, связанная тема,
// материалы, блок диалектики (тезис/антитезис/синтез),
// заметки по ходу, итоги, задачи после обсуждения.

let jitsiApi = null

async function renderRooms(filter = '') {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const data = await get('/rooms' + (filter ? `?status=${filter}` : ''))
  app().innerHTML = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold text-ink-900">Комнаты дискуссий</h1>
        <p class="text-ink-400 text-sm mt-1">Подготовка, процесс и след разговора</p>
      </div>
      <button onclick="addRoomModal()" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
        <i class="fas fa-plus mr-1.5"></i>Создать комнату
      </button>
    </div>

    <div class="flex gap-2 mb-5 flex-wrap">
      ${[['','Все'],['preparing','Подготовка'],['active','Активные'],['completed','Завершённые'],['cancelled','Отменённые']].map(([v,l]) =>
        `<button onclick="renderRooms('${v}')" class="text-xs px-3 py-1.5 rounded-full border transition ${filter===v ? 'bg-ink-800 text-white border-ink-800' : 'border-ink-200 text-ink-500 hover:border-ink-400'}">${l}</button>`
      ).join('')}
    </div>

    ${data.length === 0 ? '<div class="text-center py-16 text-ink-300"><i class="fas fa-comments text-4xl mb-3 block"></i>Нет комнат</div>' : `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${data.map(r => `
        <a href="/rooms/${r.id}" class="block bg-white rounded-xl p-5 shadow-sm border border-ink-100 hover:border-accent-300 transition group">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-ink-800 group-hover:text-accent-600 transition">${r.title}</div>
              ${r.topic_title ? `<div class="text-xs text-accent-500 mt-1"><i class="fas fa-layer-group mr-1"></i>${r.topic_title}</div>` : ''}
            </div>
            ${statusBadge(STATUS_ROOM, r.status)}
          </div>
          ${r.description ? `<p class="text-xs text-ink-400 mt-1 line-clamp-2">${r.description}</p>` : ''}
          <div class="flex items-center gap-3 mt-3 text-xs text-ink-400">
            ${r.scheduled_at ? `<span><i class="fas fa-calendar mr-1"></i>${fdate(r.scheduled_at)}</span>` : '<span class="italic">Дата не назначена</span>'}
            ${(() => { try { const p = JSON.parse(r.participants || '[]'); return p.length ? `<span><i class="fas fa-users mr-1"></i>${p.length}</span>` : '' } catch { return '' } })()}
          </div>
        </a>`).join('')}
    </div>`}
  </div>`
}

function addRoomModal() {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Создать комнату дискуссии</h3>
    <form id="room-form" class="space-y-3">
      <div>
        <label class="block text-xs text-ink-500 mb-1">Название *</label>
        <input name="title" required class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Описание</label>
        <textarea name="description" rows="2" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400 resize-none"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-ink-500 mb-1">Дата и время</label>
          <input name="scheduled_at" type="datetime-local" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
        </div>
        <div>
          <label class="block text-xs text-ink-500 mb-1">Публичная?</label>
          <select name="is_public" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
            <option value="0">Приватная</option>
            <option value="1">Публичная</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Создать</button>
      </div>
    </form>
  </div>`)

  $('#room-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    await post('/rooms', {
      title: fd.get('title'),
      description: fd.get('description') || undefined,
      scheduled_at: fd.get('scheduled_at') || undefined,
      is_public: parseInt(fd.get('is_public'))
    })
    closeModal(); toast('Комната создана')
    renderRooms()
  })
}

async function renderRoomDetail(id) {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const r = await get(`/rooms/${id}`)

  // Парсим JSON-поля
  let participants = []
  let tasks = []
  try { participants = JSON.parse(r.participants || '[]') } catch {}
  try { tasks = JSON.parse(r.tasks || '[]') } catch {}

  // Jitsi room name: уникальный, привязанный к комнате
  const jitsiRoom = `dv-hub-room-${id}`
  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}`

  app().innerHTML = `
  <div class="fade-in">
    <div class="mb-4 flex items-center justify-between">
      <a href="/rooms" class="text-sm text-ink-400 hover:text-accent-500"><i class="fas fa-arrow-left mr-1"></i>Все комнаты</a>
      <div class="flex items-center gap-2">
        ${statusBadge(STATUS_ROOM, r.status)}
        <button onclick="changeRoomStatus(${r.id}, '${r.status}')" class="text-xs text-ink-400 hover:text-ink-700 px-2 py-1 rounded border border-ink-200 hover:border-ink-400 transition">
          Статус
        </button>
      </div>
    </div>

    <!-- Заголовок и мета -->
    <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-6 mb-4">
      <h1 class="text-xl font-semibold text-ink-900 mb-2">${r.title}</h1>
      ${r.topic_title ? `<a href="/topics/${r.topic_id}" class="inline-block text-sm text-accent-500 hover:underline mb-3"><i class="fas fa-layer-group mr-1"></i>${r.topic_title}</a>` : ''}
      ${r.description ? `<p class="text-sm text-ink-500 mb-3">${r.description}</p>` : ''}
      <div class="flex items-center gap-4 text-xs text-ink-400 flex-wrap">
        ${r.scheduled_at ? `<span><i class="fas fa-calendar mr-1"></i>${fdate(r.scheduled_at)}</span>` : '<span class="italic">Дата не назначена</span>'}
        ${r.is_public ? '<span class="text-accent-500"><i class="fas fa-globe mr-1"></i>Публичная</span>' : '<span><i class="fas fa-lock mr-1"></i>Приватная</span>'}
        <span><i class="fas fa-users mr-1"></i>${participants.length} участников</span>
      </div>
    </div>

    <!-- Видеозвонок -->
    <div class="bg-gradient-to-r from-ink-800 to-ink-900 rounded-xl p-5 mb-4 text-white">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="font-medium mb-1"><i class="fas fa-video mr-2 text-accent-400"></i>Видеозвонок</h2>
          <p class="text-ink-300 text-xs">Jitsi Meet — групповой звонок, без регистрации</p>
        </div>
        <div class="flex gap-2">
          <button onclick="copyToClipboard('${jitsiUrl}')" class="bg-ink-700 hover:bg-ink-600 text-white px-3 py-2 rounded-lg text-sm transition" title="Скопировать ссылку">
            <i class="fas fa-copy mr-1"></i>Ссылка
          </button>
          <button id="jitsi-toggle-btn" onclick="toggleJitsi('${jitsiRoom}')" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition inline-flex items-center">
            <i class="fas fa-phone-alt mr-1.5"></i>Начать звонок
          </button>
        </div>
      </div>
      <div id="jitsi-container" class="mt-4 hidden">
        <div id="jitsi-meet" class="w-full rounded-lg overflow-hidden" style="height: 520px;"></div>
      </div>
    </div>

    <!-- Диалектика: тезис / антитезис / синтез -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p class="text-xs font-medium text-blue-600 mb-2"><i class="fas fa-plus-circle mr-1"></i>Тезис</p>
        ${r.thesis
          ? `<p class="text-sm text-ink-800 whitespace-pre-line">${r.thesis}</p>
             <button onclick="editRoomField(${r.id},'thesis','Тезис','${encodeURIComponent(r.thesis)}')" class="text-xs text-blue-400 hover:underline mt-2">редактировать</button>`
          : `<button onclick="editRoomField(${r.id},'thesis','Тезис','')" class="text-xs text-blue-400 hover:underline">+ Добавить</button>`}
      </div>
      <div class="bg-orange-50 rounded-xl p-4 border border-orange-100">
        <p class="text-xs font-medium text-orange-600 mb-2"><i class="fas fa-minus-circle mr-1"></i>Антитезис</p>
        ${r.antithesis
          ? `<p class="text-sm text-ink-800 whitespace-pre-line">${r.antithesis}</p>
             <button onclick="editRoomField(${r.id},'antithesis','Антитезис','${encodeURIComponent(r.antithesis)}')" class="text-xs text-orange-400 hover:underline mt-2">редактировать</button>`
          : `<button onclick="editRoomField(${r.id},'antithesis','Антитезис','')" class="text-xs text-orange-400 hover:underline">+ Добавить</button>`}
      </div>
      <div class="bg-accent-400/10 rounded-xl p-4 border border-accent-400/30">
        <p class="text-xs font-medium text-accent-600 mb-2"><i class="fas fa-star mr-1"></i>Синтез</p>
        ${r.synthesis
          ? `<p class="text-sm text-ink-800 whitespace-pre-line">${r.synthesis}</p>
             <button onclick="editRoomField(${r.id},'synthesis','Синтез','${encodeURIComponent(r.synthesis)}')" class="text-xs text-accent-500 hover:underline mt-2">редактировать</button>`
          : `<button onclick="editRoomField(${r.id},'synthesis','Синтез','')" class="text-xs text-accent-500 hover:underline">+ Добавить</button>`}
      </div>
    </div>

    <!-- Заметки и итоги -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-5">
        <h2 class="font-medium text-ink-700 mb-3"><i class="fas fa-pen-fancy mr-2 text-ink-400"></i>Заметки по ходу</h2>
        ${r.notes
          ? `<div class="text-sm text-ink-700 whitespace-pre-line leading-relaxed">${r.notes}</div>
             <button onclick="editRoomField(${r.id},'notes','Заметки','${encodeURIComponent(r.notes)}')" class="text-xs text-ink-400 hover:underline mt-3">редактировать</button>`
          : `<button onclick="editRoomField(${r.id},'notes','Заметки','')" class="text-sm text-ink-400 hover:text-accent-500"><i class="fas fa-plus mr-1"></i>Добавить заметки</button>`}
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-5">
        <h2 class="font-medium text-ink-700 mb-3"><i class="fas fa-flag-checkered mr-2 text-ink-400"></i>Итоги</h2>
        ${r.outcomes
          ? `<div class="text-sm text-ink-700 whitespace-pre-line leading-relaxed">${r.outcomes}</div>
             <button onclick="editRoomField(${r.id},'outcomes','Итоги','${encodeURIComponent(r.outcomes)}')" class="text-xs text-ink-400 hover:underline mt-3">редактировать</button>`
          : `<button onclick="editRoomField(${r.id},'outcomes','Итоги','')" class="text-sm text-ink-400 hover:text-accent-500"><i class="fas fa-plus mr-1"></i>Добавить итоги</button>`}
      </div>
    </div>

    <!-- Задачи после обсуждения -->
    <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-5 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-medium text-ink-700"><i class="fas fa-tasks mr-2 text-purple-400"></i>Задачи после обсуждения</h2>
        <button onclick="addRoomTask(${r.id})" class="text-xs text-accent-500 hover:underline">+ Добавить</button>
      </div>
      ${tasks.length ? `
      <div class="space-y-2">
        ${tasks.map((t, i) => `
          <div class="flex items-start gap-2 text-sm">
            <button onclick="toggleRoomTask(${r.id}, ${i})" class="mt-0.5 flex-shrink-0">
              <i class="fas ${t.done ? 'fa-check-circle text-accent-500' : 'fa-circle text-ink-300'} hover:text-accent-400 transition"></i>
            </button>
            <span class="${t.done ? 'line-through text-ink-400' : 'text-ink-700'}">${t.text}</span>
            <button onclick="removeRoomTask(${r.id}, ${i})" class="ml-auto text-ink-300 hover:text-red-400 transition flex-shrink-0">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>`).join('')}
      </div>` : '<p class="text-sm text-ink-400">Нет задач</p>'}
    </div>

    <!-- Связанные материалы и публикации -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-5">
        <h2 class="font-medium text-ink-700 mb-3"><i class="fas fa-inbox mr-2 text-rust-400"></i>Материалы по теме (${r.materials.length})</h2>
        ${r.materials.length ? r.materials.map(m => `
          <div class="text-sm mb-2 last:mb-0">
            <i class="fas ${TYPE_ICON[m.type] || 'fa-file'} text-ink-300 mr-1.5 text-xs"></i>
            ${m.url ? `<a href="${m.url}" target="_blank" class="text-ink-700 hover:text-accent-600">${m.title}</a>` : `<span class="text-ink-700">${m.title}</span>`}
          </div>`).join('') : '<p class="text-sm text-ink-400">Нет материалов</p>'}
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-5">
        <h2 class="font-medium text-ink-700 mb-3"><i class="fas fa-play-circle mr-2 text-red-400"></i>Публикации (${r.publications.length})</h2>
        ${r.publications.length ? r.publications.map(p => `
          <a href="${p.url}" target="_blank" class="flex items-center gap-2 text-sm mb-2 last:mb-0 hover:text-accent-600 transition">
            <i class="fas ${PLATFORM_ICON[p.platform]?.split(' ').slice(0,2).join(' ') || 'fa-link'} flex-shrink-0"></i>
            <span class="truncate">${p.title}</span>
          </a>`).join('') : '<p class="text-sm text-ink-400">Нет публикаций</p>'}
      </div>
    </div>
  </div>`
}

// ── Jitsi Meet: встроенный звонок ─────────────────────────────
// Jitsi IFrame API — официальный способ встраивать Jitsi в свой сайт.
// Загружаем API-скрипт динамически, создаём iframe с настройками.
// Передаём имя пользователя из currentUser, настраиваем интерфейс.

let jitsiApi = null  // ссылка на текущий экземпляр Jitsi API

function toggleJitsi(roomName) {
  const container = document.getElementById('jitsi-container')
  const btn = document.getElementById('jitsi-toggle-btn')

  if (jitsiApi) {
    // Звонок активен — останавливаем
    jitsiApi.dispose()  // уничтожает iframe и отключает от комнаты
    jitsiApi = null
    container.classList.add('hidden')
    btn.innerHTML = '<i class="fas fa-phone-alt mr-1.5"></i>Начать звонок'
    btn.classList.remove('bg-red-500', 'hover:bg-red-600')
    btn.classList.add('bg-accent-500', 'hover:bg-accent-600')
    return
  }

  // Запускаем звонок
  container.classList.remove('hidden')
  btn.innerHTML = '<i class="fas fa-phone-slash mr-1.5"></i>Завершить'
  btn.classList.remove('bg-accent-500', 'hover:bg-accent-600')
  btn.classList.add('bg-red-500', 'hover:bg-red-600')

  // Загружаем Jitsi IFrame API если ещё не загружен
  loadJitsiApi(() => {
    const displayName = currentUser ? currentUser.name : 'Гость'
    const avatarUrl = currentUser ? currentUser.avatar_url : ''

    jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName: roomName,
      parentNode: document.getElementById('jitsi-meet'),
      width: '100%',
      height: 520,
      configOverrides: {
        startWithAudioMuted: true,       // микрофон выключен при входе
        startWithVideoMuted: false,      // камера включена
        prejoinPageEnabled: false,        // пропускаем экран "готовы войти?"
        disableDeepLinking: true,         // не предлагать установить приложение
        defaultLanguage: 'ru',
        toolbarButtons: [
          'microphone', 'camera', 'desktop', 'fullscreen',
          'chat', 'raisehand', 'participants-pane',
          'tileview', 'settings', 'hangup'
        ],
      },
      interfaceConfigOverrides: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        TOOLBAR_ALWAYS_VISIBLE: true,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        FILM_STRIP_MAX_HEIGHT: 120,
      },
      userInfo: {
        displayName: displayName,
        avatarURL: avatarUrl || undefined,
      }
    })

    // Если участник нажал "повесить трубку" внутри Jitsi
    jitsiApi.addListener('readyToClose', () => {
      toggleJitsi(roomName)  // переключаем обратно в режим "начать"
    })
  })
}

// Загрузка Jitsi IFrame API скрипта (один раз)
function loadJitsiApi(callback) {
  if (window.JitsiMeetExternalAPI) {
    callback()
    return
  }
  const script = document.createElement('script')
  script.src = 'https://meet.jit.si/external_api.js'
  script.onload = callback
  script.onerror = () => toast('Не удалось загрузить Jitsi', 'error')
  document.head.appendChild(script)
}

// ── Вспомогательные функции комнат ────────────────────────────

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast('Ссылка скопирована')).catch(() => toast('Не удалось скопировать', 'error'))
}

function changeRoomStatus(id, current) {
  const statuses = ['preparing','active','completed','cancelled']
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Изменить статус комнаты</h3>
    <div class="space-y-2">
      ${statuses.map(s => `
        <button onclick="setRoomStatus(${id},'${s}')" class="w-full text-left px-4 py-2.5 rounded-lg border transition flex items-center justify-between ${s===current ? 'border-accent-400 bg-accent-400/10' : 'border-ink-200 hover:border-ink-300'}">
          ${statusBadge(STATUS_ROOM, s)}
          ${s===current ? '<i class="fas fa-check text-accent-500"></i>' : ''}
        </button>`).join('')}
    </div>
  </div>`)
}

async function setRoomStatus(id, status) {
  await patch(`/rooms/${id}`, { status })
  closeModal(); toast('Статус обновлён')
  renderRoomDetail(id)
}

function editRoomField(id, field, label, currentVal = '') {
  const decoded = currentVal ? decodeURIComponent(currentVal) : ''
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">${label}</h3>
    <form id="room-field-form" class="space-y-3">
      <textarea name="value" rows="6" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400" placeholder="${label}...">${decoded}</textarea>
      <div class="flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Сохранить</button>
      </div>
    </form>
  </div>`)
  $('#room-field-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const val = new FormData(e.target).get('value')
    await patch(`/rooms/${id}`, { [field]: val })
    closeModal(); toast(`${label} — сохранено`)
    renderRoomDetail(id)
  })
}

// ── Задачи (хранятся как JSON-массив в поле tasks) ────────────
// Формат: [{"text": "...", "done": false}, ...]

async function getRoomTasks(roomId) {
  const r = await get(`/rooms/${roomId}`)
  try { return JSON.parse(r.tasks || '[]') } catch { return [] }
}

function addRoomTask(roomId) {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Новая задача</h3>
    <form id="task-form" class="space-y-3">
      <input name="text" required placeholder="Что нужно сделать..." class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      <div class="flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Добавить</button>
      </div>
    </form>
  </div>`)
  $('#task-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const text = new FormData(e.target).get('text')
    const tasks = await getRoomTasks(roomId)
    tasks.push({ text, done: false })
    await patch(`/rooms/${roomId}`, { tasks })
    closeModal(); toast('Задача добавлена')
    renderRoomDetail(roomId)
  })
}

async function toggleRoomTask(roomId, index) {
  const tasks = await getRoomTasks(roomId)
  if (tasks[index]) tasks[index].done = !tasks[index].done
  await patch(`/rooms/${roomId}`, { tasks })
  renderRoomDetail(roomId)
}

async function removeRoomTask(roomId, index) {
  const tasks = await getRoomTasks(roomId)
  tasks.splice(index, 1)
  await patch(`/rooms/${roomId}`, { tasks })
  toast('Задача удалена')
  renderRoomDetail(roomId)
}
