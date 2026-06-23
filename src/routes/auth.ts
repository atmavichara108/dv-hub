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
  createTelegramAuthToken,
  findTelegramAuthToken,
  markTelegramAuthTokenUsed,
  type Env,
} from "../lib/auth";

const auth = new Hono<Env>();

// ── Кто я? ────────────────────────────────────────
auth.get("/me", async (c) => {
  const sessionId = getCookie(c, "session");
  if (!sessionId) return c.json({ user: null });

  const session = c.env.DB.prepare(
    `SELECT u.id, u.name, u.role, u.telegram_id, u.email, u.avatar_url
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`,
  ).get(sessionId);

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

  // Проверка auth_date (не старше 5 минут)
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
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
  c.env.DB.prepare(
    `INSERT INTO email_tokens (token, email, expires_at) VALUES (?, ?, ?)`,
  ).run(token, email.toLowerCase().trim(), expiresAt.toISOString());

  // Базовый URL для письма
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Отправка письма через Resend
  const result = await sendMagicLink(
    email,
    token,
    c.env.RESEND_API_KEY,
    c.env.RESEND_FROM_EMAIL,
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
  const record = c.env.DB.prepare(
    `SELECT * FROM email_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
  ).get(token) as { email: string } | undefined;

  if (!record) return c.redirect("/?auth_error=invalid_token");

  // Помечаем токен как использованный
  c.env.DB.prepare(`UPDATE email_tokens SET used = 1 WHERE token = ?`).run(
    token,
  );

  // Поиск/создание пользователя по e‑mail
  const email = record.email;
  const user = await findOrCreateUser(c.env.DB, {
    email,
    name: email.split("@")[0], // имя берём из части перед @
  });

  await createSession(c, user.id);
  return c.redirect("/?auth_success=1");
});

// ── Telegram Init: Generate token for bot login ─────────────────
auth.post("/telegram-init", async (c) => {
  const token = createTelegramAuthToken(c.env.DB);

  return c.json({
    ok: true,
    botUrl: `https://t.me/${c.env.TELEGRAM_BOT_USERNAME}?start=${token}`,
    botUsername: c.env.TELEGRAM_BOT_USERNAME,
    token,
  });
});

// ── Telegram Status: Check if token is bound to a Telegram user ──
auth.get("/telegram-status", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ ready: false });

  const authToken = findTelegramAuthToken(c.env.DB, token);
  if (!authToken || authToken.used === 1) return c.json({ ready: false });

  // Check expiration
  if (new Date(authToken.expires_at) < new Date()) {
    return c.json({ ready: false });
  }

  const ready = !!authToken.user_telegram_id;
  return c.json({ ready });
});

// ── Telegram Complete: Create session in current browser ─────────
auth.post("/telegram-complete", async (c) => {
  const { token } = (await c.req.json()) as { token: string };

  const authToken = findTelegramAuthToken(c.env.DB, token);
  if (!authToken || !authToken.user_telegram_id || authToken.used === 1) {
    return c.json({ error: "Invalid or expired token" }, 400);
  }

  // Check expiration
  if (new Date(authToken.expires_at) < new Date()) {
    return c.json({ error: "Token expired" }, 400);
  }

  // Create user and session in current browser
  const user = await findOrCreateUser(c.env.DB, {
    telegram_id: authToken.user_telegram_id,
    name: authToken.user_name || `User ${authToken.user_telegram_id.slice(-4)}`,
  });

  await createSession(c, user.id);

  // Atomic mark-as-used: returns 0 if already used (race condition guard)
  const changes = markTelegramAuthTokenUsed(c.env.DB, token);
  if (changes === 0) {
    return c.json({ error: "Token already used" }, 400);
  }

  return c.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

// ── Telegram Callback: Complete auth after bot interaction ──────
auth.get("/telegram-callback", async (c) => {
  const token = c.req.query("token");

  if (!token) {
    return c.html(errorPage("Ошибка авторизации", "Токен не указан."));
  }

  const authToken = findTelegramAuthToken(c.env.DB, token);

  if (!authToken) {
    return c.html(
      errorPage("Токен не найден или истёк", "Попробуйте войти снова."),
    );
  }

  if (authToken.used === 1) {
    return c.html(
      errorPage(
        "Вы уже авторизованы",
        "Если нужно войти заново, обновите страницу.",
      ),
    );
  }

  // Check expiration
  if (new Date(authToken.expires_at) < new Date()) {
    return c.html(errorPage("Ссылка истекла", "Попробуйте войти снова."));
  }

  if (!authToken.user_telegram_id) {
    // User hasn't pressed Start in the bot yet — show waiting page with auto-reload
    return c.html(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ожидание авторизации · DV Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-ink-50 text-ink-800 min-h-screen flex items-center justify-center">
  <div class="text-center p-8">
    <div class="text-4xl mb-4"><i class="fas fa-hourglass-half text-accent-500"></i></div>
    <h2 class="text-xl font-semibold mb-2">Ожидание авторизации</h2>
    <p class="text-ink-400 mb-4">Пожалуйста, откройте бота и нажмите <strong>Start</strong>.</p>
    <p class="text-ink-400 text-sm">Эта страница обновится автоматически.</p>
    <div class="mt-6">
      <i class="fas fa-circle-notch fa-spin text-accent-500 text-2xl"></i>
    </div>
    <a href="/" class="inline-block mt-6 text-sm text-ink-400 hover:text-ink-600 transition">Вернуться на главную</a>
  </div>
  <script>
    setTimeout(() => window.location.reload(), 3000);
  </script>
</body>
</html>`);
  }

  // Token is valid and has telegram ID — show success page.
  // Session creation happens via polling in the original browser (telegram-complete).
  return c.html(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Авторизация успешна · DV Hub</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 40px; }
    h2 { color: #4d7c5b; }
  </style>
</head>
<body>
  <h2>✅ Авторизация успешна!</h2>
  <p>Можете закрыть это окно и вернуться в браузер.</p>
</body>
</html>`);
});

// ── Выход ───────────────────────────────────────
auth.post("/logout", async (c) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) {
    c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
    deleteCookie(c, "session", { path: "/" });
  }
  return c.json({ ok: true });
});

export default auth;

// ── Helpers ───────────────────────────────────────────────────

function errorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · DV Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-ink-50 text-ink-800 min-h-screen flex items-center justify-center">
  <div class="text-center p-8">
    <div class="text-4xl mb-4"><i class="fas fa-exclamation-circle text-red-400"></i></div>
    <h2 class="text-xl font-semibold mb-2">${title}</h2>
    <p class="text-ink-400 mb-6">${message}</p>
    <a href="/" class="inline-block bg-ink-800 hover:bg-ink-900 text-white px-6 py-2 rounded-lg text-sm font-medium transition">Вернуться на главную</a>
  </div>
</body>
</html>`;
}
