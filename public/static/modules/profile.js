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
