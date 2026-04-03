// src/index.tsx
// Главный файл приложения. Hono — это web-фреймворк (как Express, но легче).
// Здесь мы:
// 1. Объявляем типы переменных окружения (Bindings)
// 2. Подключаем роуты: auth (авторизация) и api (данные)
// 3. Раздаём статические файлы
// 4. Отдаём HTML-оболочку SPA на все страницы

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import api from './routes/api'
import auth from './routes/auth'

// Bindings — переменные окружения, которые Cloudflare передаёт в Worker.
// DB — база данных D1
// TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME — для проверки Telegram Login
// RESEND_API_KEY — для отправки email

type Bindings = {
  DB: D1Database
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_BOT_USERNAME: string
  RESEND_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// Подключаем auth-роуты
app.route('/auth', auth)

// Подключаем API-роуты
app.route('/api', api)

// ── HTML SHELL ────────────────────────────────────────────────
// Это SPA (Single Page Application) — один HTML загружается один раз,
// дальше JavaScript рисует разные страницы без перезагрузки.
// TELEGRAM_BOT_USERNAME передаём в HTML чтобы фронтенд мог показать виджет.

const html = (title: string = 'DV Hub', botUsername: string = '') => `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · Дискуссионные Вечера</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            ink: { 50:'#f5f4f0', 100:'#e8e5db', 200:'#d1cbb8', 300:'#b5ab92', 400:'#998c70', 500:'#7d7058', 600:'#635847', 700:'#4d4438', 800:'#3a332b', 900:'#27231e' },
            accent: { 400:'#6b9e78', 500:'#4d7c5b', 600:'#3a6047' },
            rust:   { 400:'#c97b4b', 500:'#a85e32' },
          },
          fontFamily: { sans: ['Inter','system-ui','sans-serif'] }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .fade-in { animation: fadeIn .3s ease; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
    .status-badge { @apply text-xs font-medium px-2 py-0.5 rounded-full; }
    [x-cloak] { display: none; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #d1cbb8; border-radius: 2px; }
  </style>
  <script>window.__TG_BOT_USERNAME__ = '${botUsername}';</script>
</head>
<body class="bg-ink-50 text-ink-800 min-h-screen">

<!-- NAVBAR -->
<nav class="bg-ink-900 text-ink-100 sticky top-0 z-50 shadow-lg">
  <div class="max-w-[1400px] mx-auto px-4 flex items-center justify-between h-14">
    <a href="/" class="flex items-center gap-2 font-semibold text-base tracking-tight">
      <span class="text-accent-400"><i class="fas fa-fire-alt"></i></span>
      <span>DV Hub</span>
      <span class="hidden sm:inline text-ink-400 text-xs font-normal ml-1">Дискуссионные Вечера</span>
    </a>
    <div class="flex items-center gap-1 text-sm">
      <button id="mobile-menu-btn" class="sm:hidden px-2 py-1.5 rounded hover:bg-ink-700 transition" onclick="toggleMobileMenu()">
        <i class="fas fa-bars"></i>
      </button>
      <div id="nav-links" class="hidden sm:flex items-center gap-1">
        <a href="/" class="nav-link px-3 py-1.5 rounded hover:bg-ink-700 transition" data-page="dashboard"><i class="fas fa-th-large mr-1.5"></i><span class="hidden md:inline">Дашборд</span></a>
        <a href="/materials" class="nav-link px-3 py-1.5 rounded hover:bg-ink-700 transition" data-page="materials"><i class="fas fa-inbox mr-1.5"></i><span class="hidden md:inline">Материалы</span></a>
        <a href="/topics" class="nav-link px-3 py-1.5 rounded hover:bg-ink-700 transition" data-page="topics"><i class="fas fa-layer-group mr-1.5"></i><span class="hidden md:inline">Темы</span></a>
        <a href="/rooms" class="nav-link px-3 py-1.5 rounded hover:bg-ink-700 transition" data-page="rooms"><i class="fas fa-comments mr-1.5"></i><span class="hidden md:inline">Дискуссии</span></a>
        <a href="/media" class="nav-link px-3 py-1.5 rounded hover:bg-ink-700 transition" data-page="media"><i class="fas fa-play-circle mr-1.5"></i><span class="hidden md:inline">Медиа</span></a>
      </div>
      <div id="auth-nav" class="ml-2"></div>
    </div>
  </div>
  <!-- MOBILE NAV DROPDOWN -->
  <div id="mobile-nav" class="sm:hidden hidden bg-ink-800 border-t border-ink-700">
    <div class="max-w-[1400px] mx-auto px-4 py-2 flex flex-col gap-1">
      <a href="/" class="nav-link px-3 py-2 rounded hover:bg-ink-700 transition text-sm" data-page="dashboard" onclick="closeMobileMenu()"><i class="fas fa-th-large mr-2"></i>Дашборд</a>
      <a href="/materials" class="nav-link px-3 py-2 rounded hover:bg-ink-700 transition text-sm" data-page="materials" onclick="closeMobileMenu()"><i class="fas fa-inbox mr-2"></i>Материалы</a>
      <a href="/topics" class="nav-link px-3 py-2 rounded hover:bg-ink-700 transition text-sm" data-page="topics" onclick="closeMobileMenu()"><i class="fas fa-layer-group mr-2"></i>Темы</a>
      <a href="/rooms" class="nav-link px-3 py-2 rounded hover:bg-ink-700 transition text-sm" data-page="rooms" onclick="closeMobileMenu()"><i class="fas fa-comments mr-2"></i>Дискуссии</a>
      <a href="/media" class="nav-link px-3 py-2 rounded hover:bg-ink-700 transition text-sm" data-page="media" onclick="closeMobileMenu()"><i class="fas fa-play-circle mr-2"></i>Медиа</a>
    </div>
  </div>
</nav>

<!-- APP ROOT -->
<div id="app" class="max-w-[1400px] mx-auto px-4 py-6"></div>

<!-- MODAL OVERLAY -->
<div id="modal-overlay" class="fixed inset-0 bg-black/50 z-40 hidden flex items-center justify-center p-4">
  <div id="modal-content" class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"></div>
</div>

<!-- TOAST -->
<div id="toast" class="fixed bottom-4 right-4 z-50 hidden">
  <div id="toast-inner" class="bg-ink-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/locale/ru.min.js"></script>
<script async src="https://telegram.org/js/telegram-widget.js?22"></script>
<script src="/static/app.js"></script>
</body>
</html>`

// SPA — все страницы отдают один HTML
const page = (c: any, title: string) => c.html(html(title, c.env.TELEGRAM_BOT_USERNAME || ''))

app.get('/', (c) => page(c, 'Дашборд'))
app.get('/materials', (c) => page(c, 'Материалы'))
app.get('/materials/*', (c) => page(c, 'Материалы'))
app.get('/topics', (c) => page(c, 'Темы'))
app.get('/topics/*', (c) => page(c, 'Темы'))
app.get('/rooms', (c) => page(c, 'Дискуссии'))
app.get('/rooms/*', (c) => page(c, 'Дискуссии'))
app.get('/media', (c) => page(c, 'Медиа'))
app.get('/login', (c) => page(c, 'Вход'))
app.get('/admin', (c) => page(c, 'Админка'))
app.get('/admin/*', (c) => page(c, 'Админка'))
app.get('/profile', (c) => page(c, 'Профиль'))


export default app
