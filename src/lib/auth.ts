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
// В этом файле реализована отправка magic‑link‑ов через Resend SDK.

import { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Database } from "better-sqlite3";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
//  Env
// ---------------------------------------------------------------------------
//
// Bindings for Node.js runtime (better-sqlite3 + process.env).
//   - DB:               better-sqlite3 Database instance
//   - TELEGRAM_BOT_TOKEN: Telegram Bot token
//   - RESEND_API_KEY:    API key for Resend
//   - RESEND_FROM_EMAIL: From‑address used in outgoing mail
//
export type Env = {
  Bindings: {
    DB: Database;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_BOT_USERNAME: string;
    TELEGRAM_WEBHOOK_SECRET: string;
    RESEND_API_KEY: string;
    RESEND_FROM_EMAIL: string;
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
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
  ).run(sessionId, userId, expiresAt.toISOString());

  setCookie(c, "session", sessionId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  });

  return sessionId;
}

// ---------------------------------------------------------------------------
//  Find or create a user (Telegram or e‑mail)
// ---------------------------------------------------------------------------
export async function findOrCreateUser(
  db: Database,
  opts: {
    telegram_id?: string;
    email?: string;
    name: string;
    avatar_url?: string;
  },
): Promise<{ id: number; role: string; name: string }> {
  let user: { id: number; role: string; name: string } | undefined;

  if (opts.telegram_id) {
    user = db
      .prepare(`SELECT id, role, name FROM users WHERE telegram_id = ?`)
      .get(opts.telegram_id) as
      | { id: number; role: string; name: string }
      | undefined;
  }
  if (!user && opts.email) {
    user = db
      .prepare(`SELECT id, role, name FROM users WHERE email = ?`)
      .get(opts.email) as
      | { id: number; role: string; name: string }
      | undefined;
  }

  if (user) {
    // Update last_seen timestamp
    db.prepare(
      `UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
    ).run(user.id);
    return { id: user.id, role: user.role, name: user.name };
  }

  // Create a new guest user
  const result = db
    .prepare(
      `INSERT INTO users (telegram_id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, 'guest')`,
    )
    .run(
      opts.telegram_id || null,
      opts.email || null,
      opts.name,
      opts.avatar_url || null,
    );

  return {
    id: Number(result.lastInsertRowid),
    role: "guest",
    name: opts.name,
  };
}

// ---------------------------------------------------------------------------
//  Magic‑link sending via Resend
// ---------------------------------------------------------------------------
export async function sendMagicLink(
  email: string,
  token: string,
  resendApiKey: string,
  resendFromEmail: string,
  baseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const link = `${baseUrl}/auth/verify-email?token=${token}`;

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
        Ссылка действительна 15 минут. Если вы не запрашивали вход — игнорируйте это письмо.
      </p>
    </div>
  `;

  try {
    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: resendFromEmail,
      to: [email],
      subject: "Вход в DV Hub — Дискуссионные Вечера",
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
//  Auth middleware
// ---------------------------------------------------------------------------
// Public POST endpoints that don't require authentication
// NOTE: c.req.path returns the full path including the mount prefix.
const PUBLIC_WRITE_PATHS = ["/api/submit-idea"];

// GET path prefixes that are publicly accessible without authentication.
// Any GET request NOT matching these prefixes (e.g. /api/profile) still requires auth.
// NOTE: c.req.path returns the full path including the mount prefix (e.g. /api/dashboard).
const PUBLIC_GET_PREFIXES = [
  "/api/dashboard",
  "/api/materials",
  "/api/topics",
  "/api/rooms",
  "/api/publications",
  "/api/users",
];

export async function authMiddleware(c: Context<Env>, next: Next) {
  const path = c.req.path;
  const method = c.req.method;

  // Allow unauthenticated GET requests on public read-only paths.
  // Admin routes and non-listed GET paths (e.g. /api/profile) always require auth.
  if (method === "GET") {
    const isPublicGet = PUBLIC_GET_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + "/"),
    );
    if (isPublicGet) {
      return next();
    }
  }

  // Allow specific public write endpoints (e.g. idea submission)
  if (PUBLIC_WRITE_PATHS.some((p) => path === p || path.endsWith(p))) {
    return next();
  }

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

  const session = c.env.DB.prepare(
    `SELECT s.user_id, s.expires_at, u.id, u.name, u.role, u.telegram_id, u.email, u.avatar_url
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`,
  ).get(sessionId) as
    | {
        user_id: number;
        id: number;
        name: string;
        role: string;
        telegram_id?: string;
        email?: string;
        avatar_url?: string;
      }
    | undefined;

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
//  Telegram Auth Token Management (webhook-based login flow)
// ---------------------------------------------------------------------------

/**
 * Generate a random token for the Telegram bot auth flow.
 * Token is valid for 15 minutes.
 */
export function createTelegramAuthToken(db: Database): string {
  const token =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  db.prepare(
    `INSERT INTO telegram_auth_tokens (token, expires_at) VALUES (?, ?)`,
  ).run(token, expiresAt.toISOString());

  return token;
}

/**
 * Look up a telegram auth token by its value.
 * Returns null if not found.
 */
export function findTelegramAuthToken(
  db: Database,
  token: string,
): {
  token: string;
  user_telegram_id: string | null;
  expires_at: string;
  used: number;
} | null {
  return db
    .prepare(
      `SELECT token, user_telegram_id, expires_at, used
       FROM telegram_auth_tokens WHERE token = ?`,
    )
    .get(token) as {
    token: string;
    user_telegram_id: string | null;
    expires_at: string;
    used: number;
  } | null;
}

/**
 * Bind a telegram user ID to an existing auth token (called from webhook).
 */
export function updateTelegramAuthToken(
  db: Database,
  token: string,
  userTelegramId: string,
): void {
  db.prepare(
    `UPDATE telegram_auth_tokens SET user_telegram_id = ? WHERE token = ?`,
  ).run(userTelegramId, token);
}

/**
 * Mark a token as used so it cannot be reused.
 */
export function markTelegramAuthTokenUsed(db: Database, token: string): void {
  db.prepare(`UPDATE telegram_auth_tokens SET used = 1 WHERE token = ?`).run(
    token,
  );
}

/**
 * Delete expired or already-used tokens (periodic cleanup).
 */
export function cleanupExpiredTelegramTokens(db: Database): void {
  db.prepare(
    `DELETE FROM telegram_auth_tokens
     WHERE expires_at < datetime('now') OR used = 1`,
  ).run();
}

// ---------------------------------------------------------------------------
//  Role‑based middleware factory
// ---------------------------------------------------------------------------
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context<Env>, next: Next) => {
    const user = c.get("user") as Env["Variables"]["user"] | undefined;
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
