
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
  '/static/modules/router.js',  // последний — зависит от всех рендереров
]

// Последовательная загрузка скриптов
;(async function loadModules() {
  for (const src of modules) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src
      s.onload = resolve
      s.onerror = () => reject(new Error('Failed to load ' + src))
      document.body.appendChild(s)
    })
  }

  // Инициализация после загрузки всех модулей
  checkAuthParams()
  loadCurrentUser().then(() => {
    navigate(location.pathname, false)
  })
})()
