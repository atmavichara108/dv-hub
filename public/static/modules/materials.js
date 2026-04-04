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
    const tagsRaw = fd.get('tags')
    try {
      await post('/materials', {
        title: fd.get('title'),
        url: fd.get('url') || undefined,
        description: fd.get('description') || undefined,
        type: fd.get('type'),
        tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
        topic_id: fd.get('topic_id') ? parseInt(fd.get('topic_id')) : undefined
      })
      closeModal(); toast('Материал добавлен')
      renderMaterials()
    } catch (err) {
      toast('Ошибка: ' + (err.response?.data?.error || err.message), 'error')
    }
  })
  // $('#material-form')?.addEventListener('submit', async e => {
  //   e.preventDefault()
  //   const fd = new FormData(e.target)
  //   const tagsRaw = fd.get('tags') || ''
  //   const tagsArr = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
  //   const topicId = fd.get('topic_id') ? parseInt(fd.get('topic_id')) : undefined
  //   await post('/materials', {
  //     title: fd.get('title'), url: fd.get('url') || undefined,
  //     description: fd.get('description') || undefined, type: fd.get('type'),
  //     tags: tagsArr, topic_id: topicId
  //   })
  //   closeModal(); toast('Материал добавлен')
  //   renderMaterials()
  // })
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

