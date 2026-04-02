// src/lib/auth.ts
// Модуль авторизации: Telegram Login, Email Magic Link, сессии, middleware.
//
// Ключевые понятия:
// - HMAC-SHA256: алгоритм проверки подписи. Telegram подписывает данные
//   пользователя ключом, созданным из Bot Token. Мы пересоздаём подпись
//   и сравниваем — если совпала, данные не подделаны.
// - Cookie: маленький кусок данных, который браузер автоматически
//   отправляет серверу при каждом запросе. Мы храним в нём session ID.
// - Middleware: функция-прослойка между запросом и обработчиком.
//   Проверяет авторизацию ДО выполнения основной логики.

import { Context, Next } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

type Env = { Bindings: { DB: D1Database; TELEGRAM_BOT_TOKEN: string; TELEGRAM_BOT_USERNAME: string; RESEND_API_KEY: string } }

// ── Telegram Login: проверка подписи ──────────────────────────
// Telegram отдаёт: id, first_name, last_name, username, photo_url, auth_date, hash
// Мы должны проверить hash, чтобы убедиться что данные пришли от Telegram.

export async function verifyTelegramLogin(params: Record<string, string>, botToken: string): Promise<boolean> {
  // 1. Собираем все поля кроме hash в алфавитном порядке
  const checkString = Object.keys(params)
    .filter(k => k !== 'hash')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('\n')

  // 2. Создаём ключ: SHA-256 от Bot Token
  const encoder = new TextEncoder()
  const secretKey = await crypto.subtle.digest('SHA-256', encoder.encode(botToken))

  // 3. Подписываем строку этим ключом через HMAC-SHA256
  const key = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(checkString))

  // 4. Сравниваем с hash от Telegram
  const hex = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === params.hash
}

// ── Создание сессии ───────────────────────────────────────────
// Генерируем случайный ID, записываем в БД, ставим cookie.

export async function createSession(c: Context<Env>, userId: number): Promise<string> {
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней

  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  ).bind(sessionId, userId, expiresAt.toISOString()).run()

  setCookie(c, 'session', sessionId, {
    path: '/',
    httpOnly: true,     // JS на странице не может прочитать cookie — защита от XSS
    secure: true,       // Только через HTTPS
    sameSite: 'Lax',    // Защита от CSRF, но позволяет переход по ссылкам
    maxAge: 30 * 24 * 60 * 60  // 30 дней в секундах
  })

  return sessionId
}

// ── Найти или создать пользователя ────────────────────────────
// При входе через Telegram или email: если пользователь уже есть — вернуть его,
// если нет — создать с ролью 'guest'.

export async function findOrCreateUser(
  db: D1Database,
  opts: { telegram_id?: string; email?: string; name: string; avatar_url?: string }
): Promise<{ id: number; role: string; name: string }> {
  let user = null

  if (opts.telegram_id) {
    user = await db.prepare(`SELECT id, role, name FROM users WHERE telegram_id = ?`).bind(opts.telegram_id).first()
  }
  if (!user && opts.email) {
    user = await db.prepare(`SELECT id, role, name FROM users WHERE email = ?`).bind(opts.email).first()
  }

  if (user) {
    // Обновляем last_seen
    await db.prepare(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`).bind(user.id).run()
    return user as { id: number; role: string; name: string }
  }

  // Создаём нового пользователя
  const result = await db.prepare(
    `INSERT INTO users (telegram_id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, 'guest')`
  ).bind(opts.telegram_id || null, opts.email || null, opts.name, opts.avatar_url || null).run()

  return { id: result.meta.last_row_id as number, role: 'guest', name: opts.name }
}

// ── Отправка Magic Link через Resend ─────────────────────────
// Resend — сервис отправки email через API. Бесплатный тир: 100 писем/день.

export async function sendMagicLink(email: string, token: string, resendApiKey: string, baseUrl: string): Promise<boolean> {
  const link = `${baseUrl}/auth/verify-email?token=${token}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'DV Hub <onboarding@resend.dev>',  // Resend даёт бесплатный домен для тестов
      to: [email],
      subject: 'Вход в DV Hub — Дискуссионные Вечера',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #27231e;">DV Hub</h2>
          <p>Нажмите кнопку чтобы войти:</p>
          <a href="${link}" style="display: inline-block; background: #4d7c5b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Войти в DV Hub
          </a>
          <p style="color: #998c70; font-size: 13px; margin-top: 16px;">Ссылка действительна 15 минут. Если вы не запрашивали вход — проигнорируйте это письмо.</p>
        </div>
      `
    })
  })

  return res.ok
}

// ── Auth Middleware ────────────────────────────────────────────
// Проверяет cookie 'session' на каждом запросе к защищённым роутам.
// Если сессия валидна — кладёт user в c.set('user', ...) чтобы
// обработчик мог узнать кто делает запрос.
// Если нет — возвращает 401.

export async function authMiddleware(c: Context<Env>, next: Next) {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) {
    return c.json({ error: 'unauthorized', message: 'Требуется авторизация' }, 401)
  }

  const session = await c.env.DB.prepare(
    `SELECT s.user_id, s.expires_at, u.id, u.name, u.role, u.telegram_id, u.email, u.avatar_url
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`
  ).bind(sessionId).first()

  if (!session) {
    deleteCookie(c, 'session', { path: '/' })
    return c.json({ error: 'unauthorized', message: 'Сессия истекла' }, 401)
  }

  // Кладём данные пользователя в контекст — любой обработчик может достать через c.get('user')
  c.set('user', {
    id: session.id,
    name: session.name,
    role: session.role,
    telegram_id: session.telegram_id,
    email: session.email,
    avatar_url: session.avatar_url
  })

  await next()
}

// ── Проверка роли ─────────────────────────────────────────────
// Фабрика middleware: requireRole('admin', 'moderator') пропустит только
// пользователей с одной из указанных ролей.

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as any
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'forbidden', message: 'Недостаточно прав' }, 403)
    }
    await next()
  }
}
