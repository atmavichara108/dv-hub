
// DV Hub — SPA Frontend
// Модульная архитектура: каждый раздел в отдельном файле

// Загрузка модулей в правильном порядке (зависимости → зависимые)
const modules = [
  '/static/modules/utils.js',
  '/static/modules/auth.js',
  '/static/modules/search.js',
  '/static/modules/dashboard.js',
  '/static/modules/materials.js',
  '/static/modules/topics.js',
  '/static/modules/rooms.js',
  '/static/modules/media.js',
  '/static/modules/admin.js',
  '/static/modules/profile.js',
  '/static/modules/faq.js',
  '/static/modules/router.js',  // последний — зависит от всех рендереров
]

// Последовательная загрузка скриптов
;(async function loadModules() {
  for (const src of modules) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src
      s.onload = resolve
      s.onerror = () => {
        const errMsg = 'Failed to load ' + src
        console.error(errMsg)
        document.getElementById('app').innerHTML = `
          <div class="text-center py-16 fade-in">
            <i class="fas fa-exclamation-triangle text-4xl text-rust-400 mb-4 block"></i>
            <p class="text-ink-500">Ошибка загрузки модуля. Попробуйте обновить страницу.</p>
          </div>`
        reject(new Error(errMsg))
      }
      document.body.appendChild(s)
    })
  }

  // Инициализация после загрузки всех модулей
  checkAuthParams()
  loadCurrentUser().then(() => {
    navigate(location.pathname, false)
  })
})()
