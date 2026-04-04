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

async function addPublicationModal() {
  // Загружаем список тем для привязки
  let topicsOptions = '<option value="">— Без привязки —</option>'
  try {
    const topics = await get('/topics')
    topicsOptions += topics.map(t => `<option value="${t.id}">${t.title}</option>`).join('')
  } catch {}

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
        <input name="url" type="url" required class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
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
        <label class="block text-xs text-ink-500 mb-1">Привязать к теме</label>
        <select name="topic_id" class="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-400">
          ${topicsOptions}
        </select>
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
    try {
      await post('/publications', {
        title: fd.get('title'),
        url: fd.get('url'),
        platform: fd.get('platform'),
        type: fd.get('type'),
        description: fd.get('description') || undefined,
        topic_id: fd.get('topic_id') ? parseInt(fd.get('topic_id')) : undefined
      })
      closeModal(); toast('Публикация добавлена')
      renderMedia()
    } catch (err) {
      toast('Ошибка: ' + (err.response?.data?.error || err.message), 'error')
    }
  })
}
