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
  if (page === 'faq') return renderFAQ()
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

const _originalNavigate = navigate
navigate = function(path, push = true) {
  if (typeof jitsiApi !== 'undefined' && jitsiApi) {
    jitsiApi.dispose()
    jitsiApi = null
  }
  _originalNavigate(path, push)
}

