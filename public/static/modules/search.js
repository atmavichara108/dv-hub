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

