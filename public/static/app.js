// DV Hub — SPA Frontend
// Дискуссионные Вечера · Research & Discussion Hub

dayjs.locale('ru')

const API = '/api'

// ─────────────────────────────────────────────────────────────
// AUTH — авторизация
// ─────────────────────────────────────────────────────────────
// currentUser — объект текущего пользователя или null (гость).
// При загрузке страницы делаем GET /auth/me чтобы узнать
// есть ли активная сессия.

let currentUser = null

async function loadCurrentUser() {
  try {
    const r = await axios.get('/auth/me')
    currentUser = r.data.user
  } catch {
    currentUser = null
  }
  renderAuthNav()
}

// Рисуем кнопку входа или аватар+имя в навбаре
function renderAuthNav() {
  const el = document.getElementById('auth-nav')
  if (!el) return

  if (currentUser) {
    const roleColors = {
      admin: 'bg-red-500', moderator: 'bg-purple-500', researcher: 'bg-blue-500',
      expert: 'bg-yellow-500', guest: 'bg-ink-500', public: 'bg-ink-400'
    }
    const roleColor = roleColors[currentUser.role] || 'bg-ink-500'
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'moderator'
    el.innerHTML = `
      <div class="flex items-center gap-2">
        ${isAdmin ? `<a href="/admin" class="text-ink-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-ink-700 transition" title="Админка"><i class="fas fa-cog"></i></a>` : ''}
        <a href="/profile" class="flex items-center gap-2 hover:opacity-80 transition">
          ${currentUser.avatar_url
            ? `<img src="${currentUser.avatar_url}" class="w-7 h-7 rounded-full">`
            : `<div class="w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center text-white text-xs font-bold">${(currentUser.name || '?')[0].toUpperCase()}</div>`
          }
          <span class="hidden sm:inline text-sm text-ink-200">${currentUser.name}</span>
          <span class="hidden sm:inline ${roleColor} text-white text-xs px-1.5 py-0.5 rounded-full">${currentUser.role}</span>
        </a>
        <button onclick="doLogout()" class="text-ink-400 hover:text-white ml-1 text-xs" title="Выйти">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>`
  } else {
    el.innerHTML = `
      <button onclick="showLoginModal()" class="bg-accent-500 hover:bg-accent-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">
        <i class="fas fa-sign-in-alt mr-1"></i>Войти
      </button>`
  }
}

// Модалка входа: Telegram + Email
function showLoginModal() {
  const botUsername = window.__TG_BOT_USERNAME__
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-2">Вход в DV Hub</h3>
    <p class="text-sm text-ink-400 mb-6">Выберите способ входа</p>

    <!-- Telegram Login -->
    <div class="mb-6">
      <p class="text-xs text-ink-500 mb-3 font-medium">Через Telegram</p>
      <div id="telegram-login-container">
        ${botUsername
          ? `<div id="tg-widget-target"></div>`
          : `<p class="text-xs text-ink-400">Telegram вход не настроен</p>`
        }
      </div>
    </div>

    <div class="flex items-center gap-3 mb-6">
      <div class="h-px bg-ink-200 flex-1"></div>
      <span class="text-xs text-ink-400">или</span>
      <div class="h-px bg-ink-200 flex-1"></div>
    </div>

    <!-- Email Magic Link -->
    <div>
      <p class="text-xs text-ink-500 mb-3 font-medium">Через Email</p>
      <form id="email-login-form" class="flex gap-2">
        <input name="email" type="email" required placeholder="your@email.com"
          class="flex-1 border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
        <button type="submit" class="bg-ink-800 hover:bg-ink-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          Отправить
        </button>
      </form>
      <div id="email-login-status" class="mt-2"></div>
    </div>

    <div class="mt-6 pt-4 border-t border-ink-100">
      <p class="text-xs text-ink-400">Без входа вы можете просматривать публичные темы и отправлять идеи.</p>
    </div>
  </div>`)

  // Инициализируем Telegram Widget
  if (botUsername) {
    setTimeout(() => {
      const container = document.getElementById('tg-widget-target')
      if (container) {
        // Telegram Widget вызовет эту глобальную функцию при успешном входе
        window.onTelegramAuth = async function(tgUser) {
          try {
            const r = await axios.post('/auth/telegram', tgUser)
            currentUser = r.data.user
            closeModal()
            renderAuthNav()
            toast('Вы вошли как ' + currentUser.name)
            navigate(location.pathname, false)  // перерисовать текущую страницу
          } catch (e) {
            toast('Ошибка входа через Telegram', 'error')
          }
        }

        const script = document.createElement('script')
        script.async = true
        script.src = `https://telegram.org/js/telegram-widget.js?22`
        script.setAttribute('data-telegram-login', botUsername)
        script.setAttribute('data-size', 'large')
        script.setAttribute('data-radius', '8')
        script.setAttribute('data-onauth', 'onTelegramAuth(user)')
        script.setAttribute('data-request-access', 'write')
        container.appendChild(script)
      }
    }, 100)
  }

  // Email форма
  document.getElementById('email-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.target
    const email = new FormData(form).get('email')
    const status = document.getElementById('email-login-status')

    status.innerHTML = '<p class="text-xs text-ink-400"><i class="fas fa-circle-notch fa-spin mr-1"></i>Отправляем...</p>'

    try {
      const r = await axios.post('/auth/email', { email })
      status.innerHTML = `<p class="text-xs text-accent-600"><i class="fas fa-check mr-1"></i>${r.data.message}</p>`
      form.reset()
    } catch (e) {
      const msg = e.response?.data?.error || 'Ошибка отправки'
      status.innerHTML = `<p class="text-xs text-red-500"><i class="fas fa-exclamation-circle mr-1"></i>${msg}</p>`
    }
  })
}

// Выход
async function doLogout() {
  try {
    await axios.post('/auth/logout')
  } catch {}
  currentUser = null
  renderAuthNav()
  toast('Вы вышли')
  navigate('/', false)
}

// Проверяем auth параметры в URL (после magic link redirect)
function checkAuthParams() {
  const params = new URLSearchParams(location.search)
  if (params.get('auth_success')) {
    // Убираем параметр из URL
    history.replaceState({}, '', location.pathname)
    loadCurrentUser().then(() => {
      if (currentUser) toast('Вы вошли как ' + currentUser.name)
    })
    return true
  }
  if (params.get('auth_error')) {
    const errors = { missing_token: 'Отсутствует токен', invalid_token: 'Ссылка недействительна или истекла' }
    toast(errors[params.get('auth_error')] || 'Ошибка входа', 'error')
    history.replaceState({}, '', location.pathname)
    return true
  }
  return false
}

let currentPage = ''

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
const $ = (s, ctx = document) => ctx.querySelector(s)
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)]
const app = () => $('#app')

function toast(msg, type = 'info') {
  const t = $('#toast'), inner = $('#toast-inner')
  inner.textContent = msg
  inner.className = `text-sm px-4 py-2.5 rounded-lg shadow-lg ${type === 'error' ? 'bg-red-700' : 'bg-ink-800'} text-white`
  t.classList.remove('hidden')
  setTimeout(() => t.classList.add('hidden'), 3000)
}

function openModal(html) {
  $('#modal-content').innerHTML = html
  $('#modal-overlay').classList.remove('hidden')
  $('#modal-overlay').classList.add('flex')
}
function closeModal() {
  $('#modal-overlay').classList.add('hidden')
  $('#modal-overlay').classList.remove('flex')
}
$('#modal-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') closeModal() })

function rel(d) { return d ? dayjs(d).fromNow ? dayjs(d).format('D MMM YYYY') : dayjs(d).format('D MMM') : '—' }
function fdate(d) { return d ? dayjs(d).format('D MMM YYYY') : '—' }

const STATUS_MATERIAL = { raw: ['Сырой','bg-ink-200 text-ink-600'], review: ['На разбор','bg-yellow-100 text-yellow-700'], linked: ['В теме','bg-accent-400/20 text-accent-600'], archive: ['Архив','bg-ink-100 text-ink-400'] }
const STATUS_TOPIC = { proposed: ['Предложена','bg-blue-100 text-blue-700'], ripening: ['Созревает','bg-yellow-100 text-yellow-700'], scheduled: ['Назначена','bg-purple-100 text-purple-700'], in_discussion: ['Обсуждается','bg-orange-100 text-orange-700'], synthesized: ['Синтез готов','bg-accent-400/20 text-accent-600'], published: ['В контент','bg-ink-800 text-white'], archive: ['Архив','bg-ink-100 text-ink-400'] }
const STATUS_ROOM = { preparing: ['Подготовка','bg-yellow-100 text-yellow-700'], active: ['Активна','bg-green-100 text-green-700'], completed: ['Завершена','bg-ink-200 text-ink-600'], cancelled: ['Отменена','bg-red-100 text-red-500'] }
const PRIORITY = { low: ['Низкий','text-ink-400'], medium: ['Средний','text-yellow-600'], high: ['Высокий','text-orange-500'], urgent: ['Срочный','text-red-600'] }
const TYPE_ICON = { link:'fa-link', note:'fa-sticky-note', video:'fa-play-circle', article:'fa-newspaper', pdf:'fa-file-pdf', idea:'fa-lightbulb', voice:'fa-microphone' }
const PLATFORM_ICON = { youtube:'fa-brands fa-youtube text-red-500', spotify:'fa-brands fa-spotify text-green-500', telegram:'fa-brands fa-telegram text-blue-400', apple_podcasts:'fa-brands fa-apple text-ink-700', rss:'fa-rss text-orange-500', other:'fa-link' }

function statusBadge(map, key) {
  const [label, cls] = map[key] || ['?','bg-ink-100 text-ink-400']
  return `<span class="status-badge ${cls}">${label}</span>`
}

function tags(raw) {
  let arr = []
  try { arr = typeof raw === 'string' ? JSON.parse(raw) : (raw || []) } catch {}
  return arr.map(t => `<a href="#" onclick="event.preventDefault(); searchByTag('${t.replace(/'/g, "\\'")}')" class="inline-block text-xs bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded mr-1 hover:bg-accent-400/20 hover:text-accent-600 transition cursor-pointer">#${t}</a>`).join('')
}

// ─────────────────────────────────────────────────────────────
// SEARCH — Поиск по тегам и тексту
// ─────────────────────────────────────────────────────────────
// При клике на тег — показываем все материалы и темы с этим тегом.
// Поиск работает на клиенте: загружаем всё и фильтруем.
// Для 4 человек и сотен записей — более чем достаточно.

async function searchByTag(tag) {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`

  const [materials, topics] = await Promise.all([
    get('/materials'),
    get('/topics')
  ])

  const matchTag = (raw) => {
    let arr = []
    try { arr = typeof raw === 'string' ? JSON.parse(raw) : (raw || []) } catch {}
    return arr.some(t => t.toLowerCase() === tag.toLowerCase())
  }

  const filteredMaterials = materials.filter(m => matchTag(m.tags))
  const filteredTopics = topics.filter(t => matchTag(t.tags))

  app().innerHTML = `
  <div class="fade-in">
    <div class="mb-6">
      <a href="/" onclick="event.preventDefault(); navigate('/')" class="text-sm text-ink-400 hover:text-accent-500"><i class="fas fa-arrow-left mr-1"></i>Дашборд</a>
      <h1 class="text-2xl font-semibold text-ink-900 mt-2">
        <span class="bg-accent-400/20 text-accent-600 px-2 py-0.5 rounded">#${tag}</span>
      </h1>
      <p class="text-ink-400 text-sm mt-1">${filteredTopics.length} тем · ${filteredMaterials.length} материалов</p>
    </div>

    ${filteredTopics.length ? `
    <div class="mb-6">
      <h2 class="font-medium text-ink-700 mb-3"><i class="fas fa-layer-group mr-2 text-accent-400"></i>Темы</h2>
      <div class="space-y-2">
        ${filteredTopics.map(t => {
          const p = PRIORITY[t.priority] || PRIORITY.medium
          return `
          <a href="/topics/${t.id}" class="block bg-white rounded-xl p-4 shadow-sm border border-ink-100 hover:border-accent-300 transition group">
            <div class="flex items-start justify-between gap-2 mb-1">
              <span class="text-sm font-medium text-ink-800 group-hover:text-accent-600 transition">${t.title}</span>
              ${statusBadge(STATUS_TOPIC, t.status)}
            </div>
            ${t.question ? `<p class="text-xs text-ink-400 mb-1">${t.question}</p>` : ''}
            <div class="flex items-center gap-2 text-xs text-ink-400">
              <span><i class="fas fa-circle ${p[1]} mr-0.5 text-[8px]"></i>${p[0]}</span>
              ${tags(t.tags)}
            </div>
          </a>`
        }).join('')}
      </div>
    </div>` : ''}

    ${filteredMaterials.length ? `
    <div>
      <h2 class="font-medium text-ink-700 mb-3"><i class="fas fa-inbox mr-2 text-rust-400"></i>Материалы</h2>
      <div class="space-y-2">
        ${filteredMaterials.map(m => `
          <div class="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
            <div class="flex items-start gap-3">
              <div class="text-lg text-ink-300 flex-shrink-0 mt-0.5 w-6 text-center">
                <i class="fas ${TYPE_ICON[m.type] || 'fa-file'}"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="font-medium text-sm text-ink-800">
                    ${m.url ? `<a href="${m.url}" target="_blank" class="hover:text-accent-600 hover:underline">${m.title}</a>` : m.title}
                  </div>
                  ${statusBadge(STATUS_MATERIAL, m.status)}
                </div>
                ${m.description ? `<p class="text-xs text-ink-400 mt-1">${m.description}</p>` : ''}
                <div class="flex items-center gap-3 mt-1 text-xs text-ink-400">
                  <span>${m.author_name || 'аноним'}</span>
                  <span>${fdate(m.created_at)}</span>
                  ${m.topic_title ? `<a href="/topics/${m.topic_id}" class="text-accent-500 hover:underline">${m.topic_title}</a>` : ''}
                </div>
                ${tags(m.tags)}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${!filteredTopics.length && !filteredMaterials.length ? '<div class="text-center py-16 text-ink-300"><i class="fas fa-search text-4xl mb-3 block"></i>Ничего не найдено по этому тегу</div>' : ''}
  </div>`
}

// ── Mobile menu ───────────────────────────────────────────────
function toggleMobileMenu() {
  const nav = document.getElementById('mobile-nav')
  if (nav) nav.classList.toggle('hidden')
}
function closeMobileMenu() {
  const nav = document.getElementById('mobile-nav')
  if (nav) nav.classList.add('hidden')
}

async function get(path) {
  const r = await axios.get(API + path)
  return r.data
}
async function post(path, data) {
  const r = await axios.post(API + path, data)
  return r.data
}
async function patch(path, data) {
  const r = await axios.patch(API + path, data)
  return r.data
}

// ─────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────
function updateNav(page) {

  $$('.nav-link').forEach(a => {
    const active = a.dataset.page === page
    a.classList.toggle('bg-ink-700', active)
    a.classList.toggle('text-white', active)
  })
  closeMobileMenu()
}

function navigate(path, push = true) {
  if (push) history.pushState({}, '', path)
  const p = path.split('/').filter(Boolean)
  const page = p[0] || 'dashboard'
  currentPage = page
  updateNav(page)
  if (page === 'dashboard' || !p[0]) return renderDashboard()
  if (page === 'materials') return p[1] ? renderMaterialDetail(p[1]) : renderMaterials()
  if (page === 'topics') return p[1] ? renderTopicDetail(p[1]) : renderTopics()
  if (page === 'rooms') return p[1] ? renderRoomDetail(p[1]) : renderRooms()
  if (page === 'media') return renderMedia()
  if (page === 'admin') return renderAdmin()
  if (page === 'profile') return renderProfile()
  renderDashboard()
}

window.addEventListener('popstate', () => navigate(location.pathname, false))
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]')
  if (!a) return
  const href = a.getAttribute('href')
  if (href && href.startsWith('/') && !href.startsWith('//')) {
    e.preventDefault()
    navigate(href)
  }
})

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
async function renderDashboard() {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const d = await get('/dashboard')
  app().innerHTML = `
  <div class="fade-in">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-ink-900">Дашборд</h1>
      <p class="text-ink-400 text-sm mt-1">Живой центр ячейки — материалы, темы, дискуссии</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

      <div class="bg-white rounded-xl p-5 shadow-sm border border-ink-100">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-medium text-ink-700"><i class="fas fa-layer-group mr-2 text-accent-400"></i>Активные темы</h2>
          <a href="/topics" class="text-xs text-accent-500 hover:underline">Все темы →</a>
        </div>
        ${d.topics.length ? d.topics.map(t => `
          <a href="/topics/${t.id}" class="block group mb-3 last:mb-0">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="text-sm font-medium text-ink-800 group-hover:text-accent-600 transition">${t.title}</div>
                <div class="text-xs text-ink-400 mt-0.5">${fdate(t.updated_at)} · ${t.material_count || 0} материалов</div>
              </div>
              ${statusBadge(STATUS_TOPIC, t.status)}
            </div>
          </a>`).join('<hr class="border-ink-100 my-2">') : '<p class="text-sm text-ink-400">Нет активных тем</p>'}
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm border border-ink-100">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-medium text-ink-700"><i class="fas fa-inbox mr-2 text-rust-400"></i>Новые материалы</h2>
          <a href="/materials" class="text-xs text-accent-500 hover:underline">Все материалы →</a>
        </div>
        ${d.materials.length ? d.materials.map(m => `
          <div class="mb-3 last:mb-0">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-medium text-ink-800 truncate">
                  <i class="fas ${TYPE_ICON[m.type] || 'fa-file'} mr-1.5 text-ink-400 text-xs"></i>
                  ${m.url ? `<a href="${m.url}" target="_blank" class="hover:text-accent-600">${m.title}</a>` : m.title}
                </div>
                <div class="text-xs text-ink-400 mt-0.5">${m.author_name || 'аноним'} · ${fdate(m.created_at)}</div>
              </div>
              ${statusBadge(STATUS_MATERIAL, m.status)}
            </div>
          </div>`).join('<hr class="border-ink-100 my-2">') : '<p class="text-sm text-ink-400">Нет материалов</p>'}
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm border border-ink-100">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-medium text-ink-700"><i class="fas fa-comments mr-2 text-purple-400"></i>Ближайшие дискуссии</h2>
          <a href="/rooms" class="text-xs text-accent-500 hover:underline">Все комнаты →</a>
        </div>
        ${d.rooms.length ? d.rooms.map(r => `
          <a href="/rooms/${r.id}" class="block group mb-3 last:mb-0">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="text-sm font-medium text-ink-800 group-hover:text-accent-600 transition">${r.title}</div>
                <div class="text-xs text-ink-400 mt-0.5">${r.topic_title ? '→ ' + r.topic_title : 'Без темы'}${r.scheduled_at ? ' · ' + fdate(r.scheduled_at) : ''}</div>
              </div>
              ${statusBadge(STATUS_ROOM, r.status)}
            </div>
          </a>`).join('<hr class="border-ink-100 my-2">') : '<p class="text-sm text-ink-400">Нет запланированных дискуссий</p>'}
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm border border-ink-100">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-medium text-ink-700"><i class="fas fa-play-circle mr-2 text-red-400"></i>Последние публикации</h2>
          <a href="/media" class="text-xs text-accent-500 hover:underline">Все медиа →</a>
        </div>
        ${d.publications.length ? d.publications.map(p => `
          <a href="${p.url}" target="_blank" class="flex items-center gap-3 mb-3 last:mb-0 group">
            ${p.thumbnail_url ? `<img src="${p.thumbnail_url}" class="w-20 h-12 object-cover rounded flex-shrink-0">` : `<div class="w-20 h-12 bg-ink-100 rounded flex items-center justify-center flex-shrink-0"><i class="fas ${PLATFORM_ICON[p.platform]?.split(' ')[0] || 'fa-link'} text-ink-300"></i></div>`}
            <div class="min-w-0">
              <div class="text-sm font-medium text-ink-800 group-hover:text-accent-600 transition truncate">${p.title}</div>
              <div class="text-xs text-ink-400 mt-0.5">${p.platform} · ${fdate(p.created_at)}</div>
            </div>
          </a>`).join('') : '<p class="text-sm text-ink-400">Нет публикаций</p>'}
      </div>

    </div>

    <div class="mt-8 bg-ink-900 rounded-xl p-6 text-white">
      <h2 class="font-medium mb-2"><i class="fas fa-paper-plane mr-2 text-accent-400"></i>Предложить идею для обсуждения</h2>
      <p class="text-ink-300 text-sm mb-4">Есть материал или мысль? Отправь — попадёт в инбокс команды.</p>
      <form id="idea-form" class="flex flex-col sm:flex-row gap-2">
        <input name="title" placeholder="Идея или ссылка..." required
          class="flex-1 bg-ink-700 border border-ink-600 text-white placeholder-ink-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
        <input name="url" placeholder="URL (опционально)"
          class="flex-1 bg-ink-700 border border-ink-600 text-white placeholder-ink-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0">
          Отправить
        </button>
      </form>
    </div>
  </div>`

  $('#idea-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    await post('/submit-idea', { title: fd.get('title'), url: fd.get('url') || undefined })
    toast('Идея отправлена!')
    e.target.reset()
  })
}

// ─────────────────────────────────────────────────────────────
// MATERIALS — Инбокс сырья
// ─────────────────────────────────────────────────────────────
// Материал — сырой объект: ссылка, заметка, видео, идея.
// Жизненный цикл: raw → review → linked (привязан к теме) → archive.
// Ключевое действие: привязка материала к теме — это мостик
// между хаосом ссылок и структурированной дискуссией.

async function renderMaterials(filter = '') {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const data = await get('/materials' + (filter ? `?status=${filter}` : ''))
  app().innerHTML = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold text-ink-900">Инбокс материалов</h1>
        <p class="text-ink-400 text-sm mt-1">Сырьё для будущих дискуссий</p>
      </div>
      <button onclick="addMaterialModal()" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
        <i class="fas fa-plus mr-1.5"></i>Добавить
      </button>
    </div>

    <div class="flex gap-2 mb-5 flex-wrap">
      ${[['','Все'],['raw','Сырые'],['review','На разбор'],['linked','В теме'],['archive','Архив']].map(([v,l]) =>
        `<button onclick="renderMaterials('${v}')" class="text-xs px-3 py-1.5 rounded-full border transition ${filter===v ? 'bg-ink-800 text-white border-ink-800' : 'border-ink-200 text-ink-500 hover:border-ink-400'}">${l}</button>`
      ).join('')}
    </div>

    ${data.length === 0 ? '<div class="text-center py-16 text-ink-300"><i class="fas fa-inbox text-4xl mb-3 block"></i>Нет материалов</div>' : `
    <div class="space-y-2">
      ${data.map(m => `
        <div class="bg-white rounded-xl p-4 shadow-sm border border-ink-100 group">
          <div class="flex items-start gap-3">
            <div class="text-lg text-ink-300 flex-shrink-0 mt-0.5 w-6 text-center">
              <i class="fas ${TYPE_ICON[m.type] || 'fa-file'}"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 flex-wrap">
                <div class="font-medium text-sm text-ink-800">
                  ${m.url ? `<a href="${m.url}" target="_blank" class="hover:text-accent-600 hover:underline">${m.title}</a>` : m.title}
                </div>
                ${statusBadge(STATUS_MATERIAL, m.status)}
              </div>
              ${m.description ? `<p class="text-xs text-ink-400 mt-1 line-clamp-2">${m.description}</p>` : ''}
              <div class="flex items-center gap-3 mt-1.5 text-xs text-ink-400 flex-wrap">
                <span>${m.author_name || 'аноним'}</span>
                <span>${fdate(m.created_at)}</span>
                ${m.topic_title ? `<a href="/topics/${m.topic_id}" class="text-accent-500 hover:underline"><i class="fas fa-layer-group mr-0.5"></i>${m.topic_title}</a>` : ''}
              </div>
              ${tags(m.tags)}
            </div>
            <div class="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onclick="linkMaterialToTopic(${m.id}, ${m.topic_id || 'null'})" class="text-xs text-ink-400 hover:text-accent-600 px-2 py-1 rounded hover:bg-ink-50" title="Привязать к теме">
                <i class="fas fa-link"></i>
              </button>
              <button onclick="editMaterialModal(${m.id})" class="text-xs text-ink-400 hover:text-ink-700 px-2 py-1 rounded hover:bg-ink-50" title="Редактировать">
                <i class="fas fa-pen"></i>
              </button>
              <button onclick="archiveMaterial(${m.id})" class="text-xs text-ink-400 hover:text-red-500 px-2 py-1 rounded hover:bg-ink-50" title="В архив">
                <i class="fas fa-archive"></i>
              </button>
            </div>
          </div>
        </div>`).join('')}
    </div>`}
  </div>`
}

function addMaterialModal() {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Добавить материал</h3>
    <form id="material-form" class="space-y-3">
      <div>
        <label class="block text-xs text-ink-500 mb-1">Название *</label>
        <input name="title" required class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">URL</label>
        <input name="url" type="url" placeholder="https://..." class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Описание</label>
        <textarea name="description" rows="2" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400 resize-none"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-ink-500 mb-1">Тип</label>
          <select name="type" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
            <option value="link">Ссылка</option>
            <option value="idea">Идея</option>
            <option value="video">Видео</option>
            <option value="article">Статья</option>
            <option value="note">Заметка</option>
            <option value="pdf">PDF</option>
            <option value="voice">Голосовое</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-ink-500 mb-1">Теги (через запятую)</label>
          <input name="tags" placeholder="тег1, тег2" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
        </div>
      </div>
      <div id="material-topic-select"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Добавить</button>
      </div>
    </form>
  </div>`)

  // Загружаем список тем для привязки
  loadTopicSelect('material-topic-select', null, 'topic_id')

  $('#material-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const tagsRaw = fd.get('tags') || ''
    const tagsArr = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    const topicId = fd.get('topic_id') ? parseInt(fd.get('topic_id')) : undefined
    await post('/materials', {
      title: fd.get('title'), url: fd.get('url') || undefined,
      description: fd.get('description') || undefined, type: fd.get('type'),
      tags: tagsArr, topic_id: topicId
    })
    closeModal(); toast('Материал добавлен')
    renderMaterials()
  })
}

// Загрузить выпадающий список тем в контейнер
async function loadTopicSelect(containerId, currentTopicId, fieldName = 'topic_id') {
  const container = document.getElementById(containerId)
  if (!container) return
  container.innerHTML = '<p class="text-xs text-ink-400"><i class="fas fa-circle-notch fa-spin mr-1"></i>Загрузка тем...</p>'

  try {
    const topics = await get('/topics')
    container.innerHTML = `
      <label class="block text-xs text-ink-500 mb-1">Привязать к теме</label>
      <select name="${fieldName}" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
        <option value="">— Без темы —</option>
        ${topics.map(t => `<option value="${t.id}" ${t.id === currentTopicId ? 'selected' : ''}>${t.title}</option>`).join('')}
      </select>`
  } catch {
    container.innerHTML = ''
  }
}

// Привязка материала к теме через модалку
async function linkMaterialToTopic(materialId, currentTopicId) {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Привязать к теме</h3>
    <form id="link-topic-form" class="space-y-3">
      <div id="link-topic-select"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Сохранить</button>
      </div>
    </form>
  </div>`)

  loadTopicSelect('link-topic-select', currentTopicId)

  $('#link-topic-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const topicId = fd.get('topic_id') ? parseInt(fd.get('topic_id')) : null
    const status = topicId ? 'linked' : 'raw'
    await patch(`/materials/${materialId}`, { topic_id: topicId, status })
    closeModal(); toast(topicId ? 'Материал привязан к теме' : 'Материал откреплён')
    renderMaterials()
  })
}

// Редактирование материала
async function editMaterialModal(id) {
  const materials = await get('/materials')
  const m = materials.find(x => x.id === id)
  if (!m) return toast('Материал не найден', 'error')

  let currentTags = []
  try { currentTags = typeof m.tags === 'string' ? JSON.parse(m.tags) : (m.tags || []) } catch {}

  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Редактировать материал</h3>
    <form id="edit-material-form" class="space-y-3">
      <div>
        <label class="block text-xs text-ink-500 mb-1">Название *</label>
        <input name="title" required value="${m.title}" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">URL</label>
        <input name="url" type="url" value="${m.url || ''}" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Описание</label>
        <textarea name="description" rows="2" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400 resize-none">${m.description || ''}</textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-ink-500 mb-1">Тип</label>
          <select name="type" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
            ${['link','idea','video','article','note','pdf','voice'].map(t =>
              `<option value="${t}" ${t === m.type ? 'selected' : ''}>${t === 'link' ? 'Ссылка' : t === 'idea' ? 'Идея' : t === 'video' ? 'Видео' : t === 'article' ? 'Статья' : t === 'note' ? 'Заметка' : t === 'pdf' ? 'PDF' : 'Голосовое'}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs text-ink-500 mb-1">Статус</label>
          <select name="status" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
            ${['raw','review','linked','archive'].map(s =>
              `<option value="${s}" ${s === m.status ? 'selected' : ''}>${STATUS_MATERIAL[s][0]}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Теги (через запятую)</label>
        <input name="tags" value="${currentTags.join(', ')}" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div id="edit-material-topic-select"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Сохранить</button>
      </div>
    </form>
  </div>`)

  loadTopicSelect('edit-material-topic-select', m.topic_id)

  $('#edit-material-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const tagsArr = (fd.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean)
    const topicId = fd.get('topic_id') ? parseInt(fd.get('topic_id')) : null
    await patch(`/materials/${id}`, {
      title: fd.get('title'), url: fd.get('url') || null,
      description: fd.get('description') || null, type: fd.get('type'),
      status: fd.get('status'), tags: tagsArr, topic_id: topicId
    })
    closeModal(); toast('Материал обновлён')
    renderMaterials()
  })
}

async function archiveMaterial(id) {
  await patch(`/materials/${id}`, { status: 'archive' })
  toast('Материал архивирован')
  renderMaterials()
}

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
    const tagsArr = (fd.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean)
    await post('/topics', {
      title: fd.get('title'), question: fd.get('question') || undefined,
      priority: fd.get('priority'), is_public: parseInt(fd.get('is_public')), tags: tagsArr
    })
    closeModal(); toast('Тема создана')
    renderTopics()
  })
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
      scheduled_at: fd.get('scheduled_at') || undefined
    })
    closeModal(); toast('Комната создана')
    renderTopicDetail(topicId)
  })
}

// ─────────────────────────────────────────────────────────────
// ROOMS — Комнаты дискуссий
// ─────────────────────────────────────────────────────────────
// Комната — это не чат, а пространство конкретного обсуждения.
// Три режима жизни: подготовка → активная дискуссия → завершена.
// На странице комнаты: мета-информация, связанная тема,
// материалы, блок диалектики (тезис/антитезис/синтез),
// заметки по ходу, итоги, задачи после обсуждения.

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

// Очистка при уходе со страницы комнаты
const originalNavigate = navigate
navigate = function(path, push = true) {
  if (jitsiApi) {
    jitsiApi.dispose()
    jitsiApi = null
  }
  originalNavigate(path, push)
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

// ─────────────────────────────────────────────────────────────
// MEDIA
// ─────────────────────────────────────────────────────────────
async function renderMedia() {
  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const data = await get('/publications')
  app().innerHTML = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold text-ink-900">Медиа</h1>
        <p class="text-ink-400 text-sm mt-1">Видео, подкасты, публикации — привязанные к темам</p>
      </div>
      <button onclick="addPublicationModal()" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
        <i class="fas fa-plus mr-1.5"></i>Добавить
      </button>
    </div>

    ${data.length === 0 ? '<div class="text-center py-16 text-ink-300"><i class="fas fa-play-circle text-4xl mb-3 block"></i>Нет публикаций</div>' : `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${data.map(p => `
        <a href="${p.url}" target="_blank" class="block bg-white rounded-xl overflow-hidden shadow-sm border border-ink-100 hover:border-accent-300 transition group">
          ${p.thumbnail_url
            ? `<div class="aspect-video overflow-hidden"><img src="${p.thumbnail_url}" class="w-full h-full object-cover group-hover:scale-105 transition"></div>`
            : `<div class="aspect-video bg-ink-100 flex items-center justify-center"><i class="fas ${PLATFORM_ICON[p.platform] || 'fa-link'} text-4xl"></i></div>`}
          <div class="p-4">
            <div class="font-medium text-sm text-ink-800 group-hover:text-accent-600 transition mb-1">${p.title}</div>
            ${p.description ? `<p class="text-xs text-ink-400 mb-2 line-clamp-2">${p.description}</p>` : ''}
            <div class="flex items-center justify-between text-xs text-ink-400">
              <span><i class="${PLATFORM_ICON[p.platform] || 'fas fa-link'} mr-1"></i>${p.platform}</span>
              ${p.topic_title ? `<a href="/topics/${p.topic_id}" class="text-accent-500 hover:underline" onclick="event.stopPropagation()">→ тема</a>` : ''}
            </div>
          </div>
        </a>`).join('')}
    </div>`}
  </div>`
}

function addPublicationModal() {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Добавить публикацию</h3>
    <form id="pub-form" class="space-y-3">
      <div>
        <label class="block text-xs text-ink-500 mb-1">Название *</label>
        <input name="title" required class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">URL *</label>
        <input name="url" required type="url" placeholder="https://..." class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-ink-500 mb-1">Платформа</label>
          <select name="platform" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
            <option value="youtube">YouTube</option>
            <option value="spotify">Spotify</option>
            <option value="telegram">Telegram</option>
            <option value="apple_podcasts">Apple Podcasts</option>
            <option value="rss">RSS</option>
            <option value="other">Другое</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-ink-500 mb-1">Тип</label>
          <select name="type" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
            <option value="video">Видео</option>
            <option value="podcast">Подкаст</option>
            <option value="article">Статья</option>
            <option value="post">Пост</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1">Описание</label>
        <textarea name="description" rows="2" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400 resize-none"></textarea>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Добавить</button>
      </div>
    </form>
  </div>`)

  $('#pub-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    await post('/publications', {
      title: fd.get('title'), url: fd.get('url'), platform: fd.get('platform'),
      type: fd.get('type'), description: fd.get('description') || undefined
    })
    closeModal(); toast('Публикация добавлена')
    renderMedia()
  })
}

// ─────────────────────────────────────────────────────────────
// ADMIN — Управление пользователями
// ─────────────────────────────────────────────────────────────
// Доступ: admin и moderator.
// Admin может менять роли всех, moderator — только guest/researcher/expert.

const ALL_ROLES = ['admin', 'moderator', 'researcher', 'expert', 'guest', 'public']
const ROLE_LABELS = { admin: 'Админ', moderator: 'Модератор', researcher: 'Исследователь', expert: 'Эксперт', guest: 'Гость', public: 'Публичный' }
const ROLE_COLORS = { admin: 'bg-red-100 text-red-700', moderator: 'bg-purple-100 text-purple-700', researcher: 'bg-blue-100 text-blue-700', expert: 'bg-yellow-100 text-yellow-700', guest: 'bg-ink-100 text-ink-500', public: 'bg-ink-50 text-ink-400' }

async function renderAdmin() {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
    app().innerHTML = `
    <div class="text-center py-16">
      <i class="fas fa-lock text-4xl text-ink-300 mb-4 block"></i>
      <p class="text-ink-500">Доступ только для администраторов и модераторов</p>
      <a href="/" class="text-sm text-accent-500 hover:underline mt-2 inline-block">← На дашборд</a>
    </div>`
    return
  }

  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`
  const users = await get('/admin/users')

  app().innerHTML = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold text-ink-900"><i class="fas fa-users-cog mr-2 text-ink-400"></i>Управление пользователями</h1>
        <p class="text-ink-400 text-sm mt-1">${users.length} пользователей в системе</p>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <th class="text-left px-4 py-3 font-medium">Пользователь</th>
              <th class="text-left px-4 py-3 font-medium">Контакт</th>
              <th class="text-left px-4 py-3 font-medium">Роль</th>
              <th class="text-left px-4 py-3 font-medium">Регистрация</th>
              <th class="text-left px-4 py-3 font-medium">Последний визит</th>
              <th class="text-right px-4 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            ${users.map(u => {
              const isSelf = currentUser && u.id === currentUser.id
              const contact = u.telegram_id ? `<i class="fab fa-telegram text-blue-400 mr-1"></i>TG: ${u.telegram_id}` : u.email ? `<i class="fas fa-envelope text-ink-400 mr-1"></i>${u.email}` : '<span class="text-ink-300">—</span>'
              return `
              <tr class="hover:bg-ink-50/50 transition ${isSelf ? 'bg-accent-400/5' : ''}">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    ${u.avatar_url
                      ? `<img src="${u.avatar_url}" class="w-8 h-8 rounded-full flex-shrink-0">`
                      : `<div class="w-8 h-8 rounded-full bg-ink-200 flex items-center justify-center text-ink-500 text-xs font-bold flex-shrink-0">${(u.name || '?')[0].toUpperCase()}</div>`
                    }
                    <div>
                      <div class="font-medium text-ink-800">${u.name}${isSelf ? ' <span class="text-xs text-accent-500">(вы)</span>' : ''}</div>
                      <div class="text-xs text-ink-400">ID: ${u.id}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-xs text-ink-500">${contact}</td>
                <td class="px-4 py-3">
                  <span class="status-badge ${ROLE_COLORS[u.role] || 'bg-ink-100 text-ink-400'}">${ROLE_LABELS[u.role] || u.role}</span>
                </td>
                <td class="px-4 py-3 text-xs text-ink-400">${fdate(u.created_at)}</td>
                <td class="px-4 py-3 text-xs text-ink-400">${u.last_seen ? fdate(u.last_seen) : '—'}</td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button onclick="changeUserRole(${u.id}, '${u.role}', '${u.name.replace(/'/g, "\\'")}')" class="text-xs text-ink-400 hover:text-ink-700 px-2 py-1 rounded hover:bg-ink-100 transition" title="Изменить роль">
                      <i class="fas fa-user-tag"></i>
                    </button>
                    ${!isSelf ? `<button onclick="confirmDeleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')" class="text-xs text-ink-400 hover:text-red-500 px-2 py-1 rounded hover:bg-ink-100 transition" title="Удалить">
                      <i class="fas fa-trash"></i>
                    </button>` : ''}
                  </div>
                </td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`
}

function changeUserRole(userId, currentRole, userName) {
  const canAssign = currentUser.role === 'admin' ? ALL_ROLES : ['guest', 'researcher', 'expert']

  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-2">Изменить роль</h3>
    <p class="text-sm text-ink-400 mb-4">${userName}</p>
    <div class="space-y-2">
      ${canAssign.map(r => `
        <button onclick="setUserRole(${userId}, '${r}')" class="w-full text-left px-4 py-3 rounded-lg border transition flex items-center justify-between ${r === currentRole ? 'border-accent-400 bg-accent-400/10' : 'border-ink-200 hover:border-ink-300'}">
          <div class="flex items-center gap-2">
            <span class="status-badge ${ROLE_COLORS[r]}">${ROLE_LABELS[r]}</span>
            <span class="text-xs text-ink-400">${getRoleDescription(r)}</span>
          </div>
          ${r === currentRole ? '<i class="fas fa-check text-accent-500"></i>' : ''}
        </button>`).join('')}
    </div>
  </div>`)
}

function getRoleDescription(role) {
  const desc = {
    admin: 'Полный доступ ко всему',
    moderator: 'Управление темами, комнатами, пользователями',
    researcher: 'Создание материалов, работа с темами',
    expert: 'Участие в дискуссиях',
    guest: 'Ограниченный просмотр',
    public: 'Только публичный контент'
  }
  return desc[role] || ''
}

async function setUserRole(userId, role) {
  await patch(`/admin/users/${userId}`, { role })
  closeModal(); toast(`Роль изменена → ${ROLE_LABELS[role]}`)
  // Если меняем свою роль — обновляем currentUser
  if (currentUser && currentUser.id === userId) {
    currentUser.role = role
    renderAuthNav()
  }
  renderAdmin()
}

function confirmDeleteUser(userId, userName) {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-2 text-red-600"><i class="fas fa-exclamation-triangle mr-2"></i>Удалить пользователя</h3>
    <p class="text-sm text-ink-500 mb-4">Вы уверены что хотите удалить <strong>${userName}</strong>? Это действие необратимо. Все сессии пользователя будут уничтожены.</p>
    <div class="flex justify-end gap-2">
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
      <button onclick="deleteUser(${userId})" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Удалить</button>
    </div>
  </div>`)
}

async function deleteUser(userId) {
  try {
    await axios.delete(`${API}/admin/users/${userId}`)
    closeModal(); toast('Пользователь удалён')
    renderAdmin()
  } catch (e) {
    toast('Ошибка удаления', 'error')
  }
}

// ─────────────────────────────────────────────────────────────
// PROFILE — Кабинет пользователя
// ─────────────────────────────────────────────────────────────

async function renderProfile() {
  if (!currentUser) {
    app().innerHTML = `
    <div class="text-center py-16">
      <i class="fas fa-user-circle text-4xl text-ink-300 mb-4 block"></i>
      <p class="text-ink-500">Войдите чтобы увидеть профиль</p>
      <button onclick="showLoginModal()" class="mt-3 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Войти</button>
    </div>`
    return
  }

  app().innerHTML = `<div class="text-center py-12 text-ink-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>`

  let profile
  try {
    profile = await get('/profile')
  } catch {
    profile = currentUser
  }

  const roleColor = ROLE_COLORS[profile.role] || 'bg-ink-100 text-ink-400'

  app().innerHTML = `
  <div class="fade-in max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold text-ink-900 mb-6">Профиль</h1>

    <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-6 mb-6">
      <div class="flex items-center gap-4 mb-6">
        ${profile.avatar_url
          ? `<img src="${profile.avatar_url}" class="w-16 h-16 rounded-full">`
          : `<div class="w-16 h-16 rounded-full bg-accent-500 flex items-center justify-center text-white text-2xl font-bold">${(profile.name || '?')[0].toUpperCase()}</div>`
        }
        <div>
          <h2 class="text-lg font-semibold text-ink-900">${profile.name}</h2>
          <span class="status-badge ${roleColor}">${ROLE_LABELS[profile.role] || profile.role}</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex items-center justify-between py-3 border-b border-ink-100">
          <div>
            <p class="text-xs text-ink-400 mb-0.5">Имя</p>
            <p class="text-sm text-ink-800 font-medium">${profile.name}</p>
          </div>
          <button onclick="editProfileName('${profile.name.replace(/'/g, "\\'")}')" class="text-xs text-accent-500 hover:underline">Изменить</button>
        </div>

        ${profile.telegram_id ? `
        <div class="py-3 border-b border-ink-100">
          <p class="text-xs text-ink-400 mb-0.5">Telegram</p>
          <p class="text-sm text-ink-800"><i class="fab fa-telegram text-blue-400 mr-1"></i>ID: ${profile.telegram_id}</p>
        </div>` : ''}

        ${profile.email ? `
        <div class="py-3 border-b border-ink-100">
          <p class="text-xs text-ink-400 mb-0.5">Email</p>
          <p class="text-sm text-ink-800"><i class="fas fa-envelope text-ink-400 mr-1"></i>${profile.email}</p>
        </div>` : ''}

        <div class="py-3 border-b border-ink-100">
          <p class="text-xs text-ink-400 mb-0.5">Роль</p>
          <p class="text-sm"><span class="status-badge ${roleColor}">${ROLE_LABELS[profile.role] || profile.role}</span></p>
          <p class="text-xs text-ink-400 mt-1">${getRoleDescription(profile.role)}</p>
        </div>

        <div class="py-3 border-b border-ink-100">
          <p class="text-xs text-ink-400 mb-0.5">В системе с</p>
          <p class="text-sm text-ink-800">${fdate(profile.created_at)}</p>
        </div>

        ${profile.last_seen ? `
        <div class="py-3">
          <p class="text-xs text-ink-400 mb-0.5">Последний визит</p>
          <p class="text-sm text-ink-800">${fdate(profile.last_seen)}</p>
        </div>` : ''}
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
      <h3 class="font-medium text-ink-700 mb-3">Сессия</h3>
      <p class="text-sm text-ink-500 mb-4">Вы вошли ${profile.telegram_id ? 'через Telegram' : profile.email ? 'через Email' : ''}. Сессия активна 30 дней.</p>
      <button onclick="doLogout()" class="bg-ink-800 hover:bg-ink-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
        <i class="fas fa-sign-out-alt mr-1.5"></i>Выйти
      </button>
    </div>
  </div>`
}

function editProfileName(currentName) {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">Изменить имя</h3>
    <form id="profile-name-form" class="space-y-3">
      <input name="name" required value="${currentName}" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
      <div class="flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
        <button type="submit" class="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Сохранить</button>
      </div>
    </form>
  </div>`)

  $('#profile-name-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const name = new FormData(e.target).get('name')
    await patch('/profile', { name })
    closeModal(); toast('Имя обновлено')
    currentUser.name = name
    renderAuthNav()
    renderProfile()
  })
}

// ─────────────────────────────────────────────────────────────
// INIT: загружаем пользователя, потом рисуем страницу
// ─────────────────────────────────────────────────────────────
checkAuthParams()
loadCurrentUser().then(() => {
  navigate(location.pathname, false)
})
