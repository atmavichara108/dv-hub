// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
dayjs.locale('ru')

const API = '/api'
const $ = (s, ctx = document) => ctx.querySelector(s)
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)]
const app = () => $('#app')

function toast(msg, type = 'info') {
  const t = $('#toast'), inner = $('#toast-inner')
  inner.textContent = msg
  inner.className = `text-sm px-4 py-2.5 rounded-lg shadow-lg ${type === 'error' ? 'bg-red-700' : 'bg-ink-800'} text-white`
  t.classList.remove('hidden')
  setTimeout(() => t.classList.add('hidden'), 3000)
}

function openModal(html) {
  $('#modal-content').innerHTML = html
  $('#modal-overlay').classList.remove('hidden')
  $('#modal-overlay').classList.add('flex')
}
function closeModal() {
  $('#modal-overlay').classList.add('hidden')
  $('#modal-overlay').classList.remove('flex')
}
$('#modal-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') closeModal() })

function rel(d) { return d ? dayjs(d).fromNow ? dayjs(d).format('D MMM YYYY') : dayjs(d).format('D MMM') : '—' }
function fdate(d) { return d ? dayjs(d).format('D MMM YYYY') : '—' }

const STATUS_MATERIAL = { raw: ['Сырой','bg-ink-200 text-ink-600'], review: ['На разбор','bg-yellow-100 text-yellow-700'], linked: ['В теме','bg-accent-400/20 text-accent-600'], archive: ['Архив','bg-ink-100 text-ink-400'] }
const STATUS_TOPIC = { proposed: ['Предложена','bg-blue-100 text-blue-700'], ripening: ['Созревает','bg-yellow-100 text-yellow-700'], scheduled: ['Назначена','bg-purple-100 text-purple-700'], in_discussion: ['Обсуждается','bg-orange-100 text-orange-700'], synthesized: ['Синтез готов','bg-accent-400/20 text-accent-600'], published: ['В контент','bg-ink-800 text-white'], archive: ['Архив','bg-ink-100 text-ink-400'] }
const STATUS_ROOM = { preparing: ['Подготовка','bg-yellow-100 text-yellow-700'], active: ['Активна','bg-green-100 text-green-700'], completed: ['Завершена','bg-ink-200 text-ink-600'], cancelled: ['Отменена','bg-red-100 text-red-500'] }
const PRIORITY = { low: ['Низкий','text-ink-400'], medium: ['Средний','text-yellow-600'], high: ['Высокий','text-orange-500'], urgent: ['Срочный','text-red-600'] }
const TYPE_ICON = { link:'fa-link', note:'fa-sticky-note', video:'fa-play-circle', article:'fa-newspaper', pdf:'fa-file-pdf', idea:'fa-lightbulb', voice:'fa-microphone' }
const PLATFORM_ICON = { youtube:'fa-brands fa-youtube text-red-500', spotify:'fa-brands fa-spotify text-green-500', telegram:'fa-brands fa-telegram text-blue-400', apple_podcasts:'fa-brands fa-apple text-ink-700', rss:'fa-rss text-orange-500', other:'fa-link' }

function statusBadge(map, key) {
  const [label, cls] = map[key] || ['?','bg-ink-100 text-ink-400']
  return `<span class="status-badge ${cls}">${label}</span>`
}

function tags(raw) {
  let arr = []
  try { arr = typeof raw === 'string' ? JSON.parse(raw) : (raw || []) } catch {}
  return arr.map(t => `<a href="#" onclick="event.preventDefault(); searchByTag('${t.replace(/'/g, "\\'")}')" class="inline-block text-xs bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded mr-1 hover:bg-accent-400/20 hover:text-accent-600 transition cursor-pointer">#${t}</a>`).join('')
}

// ── Mobile menu ───────────────────────────────────────────────
function toggleMobileMenu() {
  const nav = document.getElementById('mobile-nav')
  if (nav) nav.classList.toggle('hidden')
}
function closeMobileMenu() {
  const nav = document.getElementById('mobile-nav')
  if (nav) nav.classList.add('hidden')
}

async function get(path) {
  const r = await axios.get(API + path)
  return r.data
}
async function post(path, data) {
  const r = await axios.post(API + path, data)
  return r.data
}
async function patch(path, data) {
  const r = await axios.patch(API + path, data)
  return r.data
}

async function del(path) {
  const r = await axios.delete(API + path)
  return r.data
}

function confirmDelete(message, onConfirm) {
  openModal(`
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-2 text-red-600"><i class="fas fa-exclamation-triangle mr-2"></i>Удаление</h3>
    <p class="text-sm text-ink-600 mb-4">${message}</p>
    <div class="flex justify-end gap-2">
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Отмена</button>
      <button id="confirm-delete-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Удалить</button>
    </div>
  </div>`)
  $('#confirm-delete-btn')?.addEventListener('click', async () => {
    closeModal()
    await onConfirm()
  })
}

