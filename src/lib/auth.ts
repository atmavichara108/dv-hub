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
//
// В этом файле реализована отправка magic‑link‑ов через useSend
// вместо устаревшего Resend SDK.

import { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { UseSendClient } from "./useSendClient";

// ---------------------------------------------------------------------------
//  Env
// ---------------------------------------------------------------------------
//
// Bindings are provided by Cloudflare Workers. They expose:
//   - DB:               D1 Database instance
//   - TELEGRAM_BOT_TOKEN: Telegram Bot token
//   - USESEND_API_KEY:   API key for useSend
//   - USESEND_BASE_URL:  Base URL of useSend instance (e.g. https://api.usesend.com)
//   - USESEND_FROM_EMAIL: From‑address used in outgoing mail
//
export type Env = {
  Bindings: {
    DB: D1Database;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_BOT_USERNAME: string;
    USESEND_API_KEY: string;
    USESEND_BASE_URL: string;
    USESEND_FROM_EMAIL: string;
  };
  Variables: {
    user: {
      id: number;
      name: string;
      role: string;
      telegram_id?: string;
      email?: string;
      avatar_url?: string;
    };
  };
};

// ---------------------------------------------------------------------------
//  Utility: verify Telegram login signature
// ---------------------------------------------------------------------------
export async function verifyTelegramLogin(
  params: Record<string, string>,
  botToken: string,
): Promise<boolean> {
  // 1. Collect all fields except `hash` and sort them alphabetically
  const checkString = Object.keys(params)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("\n");

  // 2. Hash the check string with SHA‑256 of the bot token
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(botToken),
  );

  // 3. Sign the check string with that key via HMAC‑SHA256
  const key = await crypto.subtle.importKey(
    "raw",
    secretKey,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(checkString),
  );

  // 4. Convert signature to hexadecimal string and compare with the provided hash
  const hex = [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === params.hash;
}

// ---------------------------------------------------------------------------
//  Session handling
// ---------------------------------------------------------------------------
export async function createSession(
  c: Context<Env>,
  userId: number,
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
  )
    .bind(sessionId, userId, expiresAt.toISOString())
    .run();

  setCookie(c, "session", sessionId, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  });

  return sessionId;
}

// ---------------------------------------------------------------------------
//  Find or create a user (Telegram or e‑mail)
// ---------------------------------------------------------------------------
export async function findOrCreateUser(
  db: D1Database,
  opts: {
    telegram_id?: string;
    email?: string;
    name: string;
    avatar_url?: string;
  },
): Promise<{ id: number; role: string; name: string }> {
  let user: any = null;

  if (opts.telegram_id) {
    user = await db
      .prepare(`SELECT id, role, name FROM users WHERE telegram_id = ?`)
      .bind(opts.telegram_id)
      .first();
  }
  if (!user && opts.email) {
    user = await db
      .prepare(`SELECT id, role, name FROM users WHERE email = ?`)
      .bind(opts.email)
      .first();
  }

  if (user) {
    // Update last_seen timestamp
    await db
      .prepare(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(user.id)
      .run();
    return { id: user.id, role: user.role, name: user.name };
  }

  // Create a new guest user
  const result = await db
    .prepare(
      `INSERT INTO users (telegram_id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, 'guest')`,
    )
    .bind(
      opts.telegram_id || null,
      opts.email || null,
      opts.name,
      opts.avatar_url || null,
    )
    .run();

  return {
    id: result.meta.last_row_id as number,
    role: "guest",
    name: opts.name,
  };
}

// ---------------------------------------------------------------------------
//  Magic‑link sending via useSend
// ---------------------------------------------------------------------------
export async function sendMagicLink(
  email: string,
  token: string,
  useSendApiKey: string,
  useSendBaseUrl: string,
  useSendFromEmail: string,
  baseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const link = `${baseUrl}/auth/verify-email?token=${token}`;

  // HTML template (kept identical to the previous Resend version)
  const html = `
    <div style="font-family:sans-serif; max-width:400px; padding:20px;">
      <h2 style="color:#27231e;">DV Hub</h2>
      <p>Нажмите кнопку чтобы войти:</p>
      <a href="${link}"
         style="display:inline-block;background:#4d7c5b;color:#fff;padding:12px 24px;
                border-radius:8px;text-decoration:none;font-weight:500;">
        Войти в DV Hub
      </a>
      <p style="color:#998c70;font-size:13px;margin-top:16px;">
        Ссылка действительна 15 минут. Если вы не запрашивали вход — игнорируйте это письмо.
      </p>
    </div>
  `;

  // Initialise useSend client with injected configuration
  const client = new UseSendClient({
    apiKey: useSendApiKey,
    baseUrl: useSendBaseUrl,
    fromEmail: useSendFromEmail,
  });

  // Send the email
  const result = await client.sendEmail({
    to: [email],
    subject: "Вход в DV Hub — Дискуссия Вечер",
    html,
  });

  return result; // { success: boolean, error?: string }
}

// ---------------------------------------------------------------------------
//  Auth middleware
// ---------------------------------------------------------------------------
export async function authMiddleware(c: Context<Env>, next: Next) {
  const sessionId = getCookie(c, "session");
  if (!sessionId) {
    return c.json(
      {
        error: { code: 401, message: "unauthorized" },
        message: "Требуется авторизация",
      },
      401,
    );
  }

  const session = await c.env.DB.prepare(
    `SELECT s.user_id, s.expires_at, u.id, u.name, u.role, u.telegram_id, u.email, u.avatar_url
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`,
  )
    .bind(sessionId)
    .first();

  if (!session) {
    deleteCookie(c, "session", { path: "/" });
    return c.json(
      {
        error: { code: 401, message: "unauthorized" },
        message: "Сессия истекла",
      },
      401,
    );
  }

  // Put user data into request context for later handlers
  c.set("user", {
    id: session.id,
    name: session.name,
    role: session.role,
    telegram_id: session.telegram_id,
    email: session.email,
    avatar_url: session.avatar_url,
  } as Env["Variables"]["user"]);

  await next();
}

// ---------------------------------------------------------------------------
//  Role‑based middleware factory
// ---------------------------------------------------------------------------
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context<Env>, next: Next) => {
    const user = c.get("user") as any;
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: { code: 403, message: "forbidden" },
          message: "Недостаточно прав",
        },
        403,
      );
    }
    await next();
  };
}
