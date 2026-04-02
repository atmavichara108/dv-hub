// src/routes/auth.ts
// HTTP-роуты авторизации.
//
// Эндпоинт (endpoint) = конкретный URL + метод (GET/POST),
// на который сервер умеет отвечать.
//
// GET  /auth/me           — кто я? (возвращает данные текущего пользователя или null)
// POST /auth/telegram     — вход через Telegram Login Widget
// POST /auth/email        — запрос magic link на email
// GET  /auth/verify-email — клик по ссылке из письма
// POST /auth/logout       — выход (удаление сессии)

import { Hono } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'
import {
  verifyTelegramLogin,
  createSession,
  findOrCreateUser,
  sendMagicLink
} from '../lib/auth'

type Env = { Bindings: { DB: D1Database; TELEGRAM_BOT_TOKEN: string; TELEGRAM_BOT_USERNAME: string; RESEND_API_KEY: string } }

const auth = new Hono<Env>()

// ── Кто я? ────────────────────────────────────────────────────
// Фронтенд вызывает при загрузке страницы, чтобы понять:
// пользователь залогинен или нет.

auth.get('/me', async (c) => {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) return c.json({ user: null })

  const session = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.role, u.telegram_id, u.email, u.avatar_url
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`
  ).bind(sessionId).first()

  if (!session) {
    deleteCookie(c, 'session', { path: '/' })
    return c.json({ user: null })
  }

  return c.json({ user: session })
})

// ── Telegram Login ────────────────────────────────────────────
// Фронтенд получает данные от Telegram Widget и POST'ит сюда.
// Мы проверяем подпись и создаём сессию.

auth.post('/telegram', async (c) => {
  const body = await c.req.json()
  const botToken = c.env.TELEGRAM_BOT_TOKEN

  // Проверяем что auth_date не старше 5 минут (защита от replay-атак)
  const authDate = parseInt(body.auth_date)
  if (Date.now() / 1000 - authDate > 300) {
    return c.json({ error: 'Данные устарели, попробуйте ещё раз' }, 400)
  }

  const valid = await verifyTelegramLogin(body, botToken)
  if (!valid) {
    return c.json({ error: 'Невалидная подпись Telegram' }, 400)
  }

  // Ищем или создаём пользователя
  const name = [body.first_name, body.last_name].filter(Boolean).join(' ') || 'Telegram User'
  const user = await findOrCreateUser(c.env.DB, {
    telegram_id: String(body.id),
    name,
    avatar_url: body.photo_url || null
  })

  await createSession(c, user.id)

  return c.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } })
})

// ── Email: запрос magic link ──────────────────────────────────
// Пользователь вводит email → мы генерируем токен, сохраняем в БД,
// отправляем письмо со ссылкой.

auth.post('/email', async (c) => {
  const { email } = await c.req.json()
  if (!email || !email.includes('@')) {
    return c.json({ error: 'Введите корректный email' }, 400)
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 минут

  await c.env.DB.prepare(
    `INSERT INTO email_tokens (token, email, expires_at) VALUES (?, ?, ?)`
  ).bind(token, email.toLowerCase().trim(), expiresAt.toISOString()).run()

  // Определяем base URL (домен сайта)
  const url = new URL(c.req.url)
  const baseUrl = `${url.protocol}//${url.host}`

  const sent = await sendMagicLink(email, token, c.env.RESEND_API_KEY, baseUrl)

  if (!sent) {
    return c.json({ error: 'Не удалось отправить письмо' }, 500)
  }

  return c.json({ ok: true, message: 'Письмо отправлено. Проверьте почту.' })
})

// ── Email: проверка magic link ────────────────────────────────
// Пользователь кликает ссылку из письма → GET-запрос сюда.
// Проверяем токен, создаём сессию, редиректим на главную.

auth.get('/verify-email', async (c) => {
  const token = c.req.query('token')
  if (!token) return c.redirect('/?auth_error=missing_token')

  const record = await c.env.DB.prepare(
    `SELECT * FROM email_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
  ).bind(token).first()

  if (!record) return c.redirect('/?auth_error=invalid_token')

  // Помечаем токен как использованный
  await c.env.DB.prepare(`UPDATE email_tokens SET used = 1 WHERE token = ?`).bind(token).run()

  // Ищем или создаём пользователя
  const email = record.email as string
  const user = await findOrCreateUser(c.env.DB, {
    email,
    name: email.split('@')[0]  // имя из email, пользователь потом сможет поменять
  })

  await createSession(c, user.id)

  return c.redirect('/?auth_success=1')
})

// ── Выход ─────────────────────────────────────────────────────
// Удаляем сессию из БД и cookie из браузера.

auth.post('/logout', async (c) => {
  const sessionId = getCookie(c, 'session')
  if (sessionId) {
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run()
    deleteCookie(c, 'session', { path: '/' })
  }
  return c.json({ ok: true })
})

export default auth
