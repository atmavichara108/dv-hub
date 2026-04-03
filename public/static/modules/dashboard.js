
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

