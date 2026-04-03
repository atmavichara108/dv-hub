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
