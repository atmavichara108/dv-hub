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

