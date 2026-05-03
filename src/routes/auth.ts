// src/routes/auth.ts
// HTTP‑роуты авторизации.
// Основные эндпоинты:
//   GET  /auth/me           – кто я? (возвращает данные текущего пользователя или null)
//   POST /auth/telegram     – вход через Telegram Login Widget
//   POST /auth/email        – запрос magic‑link на e‑mail
//   GET  /auth/verify-email – проверка токена из письма
//   POST /auth/logout       – выход (удаление сессии)

import { Hono } from "hono";
import { getCookie, deleteCookie } from "hono/cookie";
import {
  verifyTelegramLogin,
  createSession,
  findOrCreateUser,
  sendMagicLink,
  type Env,
} from "../lib/auth";

const auth = new Hono<Env>();

// ── Кто я? ────────────────────────────────────────
auth.get("/me", async (c) => {
  const sessionId = getCookie(c, "session");
  if (!sessionId) return c.json({ user: null });

  const session = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.role, u.telegram_id, u.email, u.avatar_url
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`,
  )
    .bind(sessionId)
    .first();

  if (!session) {
    deleteCookie(c, "session", { path: "/" });
    return c.json({ user: null });
  }

  return c.json({ user: session });
});

// ── Telegram Login ────────────────────────────────
auth.post("/telegram", async (c) => {
  const body = await c.req.json();
  const botToken = c.env.TELEGRAM_BOT_TOKEN;

  // Проверка auth_date (не старше 5 минут)
  const authDate = parseInt(body.auth_date);
  if (Date.now() / 1000 - authDate > 300) {
    return c.json(
      { error: { code: 400, message: "Данные устарели, попробуйте ещё раз" } },
      400,
    );
  }

  const valid = await verifyTelegramLogin(body, botToken);
  if (!valid) {
    return c.json(
      { error: { code: 400, message: "Невалидная подпись Telegram" } },
      400,
    );
  }

  // Поиск/создание пользователя
  const name =
    [body.first_name, body.last_name].filter(Boolean).join(" ") ||
    "Telegram User";
  const user = await findOrCreateUser(c.env.DB, {
    telegram_id: String(body.id),
    name,
    avatar_url: body.photo_url || null,
  });

  await createSession(c, user.id);

  return c.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

// ── Email: запрос magic‑link ───────────────────────────
auth.post("/email", async (c) => {
  const { email } = await c.req.json();

  // Базовая валидация e‑mail
  if (!email || !email.includes("@")) {
    return c.json(
      { error: { code: 400, message: "Введите корректный email" } },
      400,
    );
  }

  // Создание токена и запись в БД
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
  await c.env.DB.prepare(
    `INSERT INTO email_tokens (token, email, expires_at) VALUES (?, ?, ?)`,
  )
    .bind(token, email.toLowerCase().trim(), expiresAt.toISOString())
    .run();

  // Базовый URL для письма
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Отправка письма через useSend
  const result = await sendMagicLink(
    email,
    token,
    c.env.USESEND_API_KEY,
    c.env.USESEND_BASE_URL,
    c.env.USESEND_FROM_EMAIL,
    baseUrl,
  );

  // Если отправка провалилась – возвращаем ошибку 500
  if (!result.success) {
    return c.json(
      {
        error: {
          code: 500,
          message: result.error ?? "Не удалось отправить письмо",
        },
      },
      500,
    );
  }

  // В случае успеха – сообщение пользователю
  return c.json({ ok: true, message: "Письмо отправлено. Проверьте почту." });
});

// ── Email: проверка magic‑link ───────────────────────
auth.get("/verify-email", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.redirect("/?auth_error=missing_token");

  // Поиск неиспользованного токена, пока не истёк
  const record = await c.env.DB.prepare(
    `SELECT * FROM email_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
  )
    .bind(token)
    .first();

  if (!record) return c.redirect("/?auth_error=invalid_token");

  // Помечаем токен как использованный
  await c.env.DB.prepare(`UPDATE email_tokens SET used = 1 WHERE token = ?`)
    .bind(token)
    .run();

  // Поиск/создание пользователя по e‑mail
  const email = record.email as string;
  const user = await findOrCreateUser(c.env.DB, {
    email,
    name: email.split("@")[0], // имя берём из части перед @
  });

  await createSession(c, user.id);
  return c.redirect("/?auth_success=1");
});

// ── Выход ───────────────────────────────────────
auth.post("/logout", async (c) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) {
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`)
      .bind(sessionId)
      .run();
    deleteCookie(c, "session", { path: "/" });
  }
  return c.json({ ok: true });
});

export default auth;
