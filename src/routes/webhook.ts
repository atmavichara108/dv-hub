// src/routes/webhook.ts
// Telegram Webhook endpoint.
// Receives updates from Telegram Bot API when users interact with the bot.
// Handles the /start <token> command to link a Telegram user ID to an auth token.

import { Hono } from "hono";
import type { Env } from "../lib/auth";
import { findTelegramAuthToken, updateTelegramAuthToken } from "../lib/auth";

const webhook = new Hono<Env>();

// ── Telegram Webhook ──────────────────────────────────────────
webhook.post("/telegram", async (c) => {
  // Verify webhook secret token (set via setWebhook)
  const secretToken = c.req.header("X-Telegram-Bot-Api-Secret-Token");
  if (secretToken !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.json({ error: "Invalid secret token" }, 403);
  }

  // Safely parse JSON body — Telegram may send non-JSON in edge cases
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ ok: true });
  }

  const message = body.message as
    | { text?: string; from?: { id: number } }
    | undefined;

  // Handle /start <token> command
  if (message?.text?.startsWith("/start ")) {
    if (!message.from) return c.json({ ok: true });
    const token = message.text.split(" ")[1];
    const telegramId = String(message.from.id);

    const authToken = findTelegramAuthToken(c.env.DB, token);

    if (!authToken) {
      await sendTelegramMessage(
        c.env.TELEGRAM_BOT_TOKEN,
        telegramId,
        "❌ Ссылка недействительна или истекла. Попробуйте войти снова.",
      );
      return c.json({ ok: true });
    }

    if (authToken.used === 1) {
      await sendTelegramMessage(
        c.env.TELEGRAM_BOT_TOKEN,
        telegramId,
        "✅ Вы уже авторизованы. Если нужно войти заново, обновите страницу.",
      );
      return c.json({ ok: true });
    }

    // Check if token is expired
    if (new Date(authToken.expires_at) < new Date()) {
      await sendTelegramMessage(
        c.env.TELEGRAM_BOT_TOKEN,
        telegramId,
        "❌ Ссылка истекла. Попробуйте войти снова.",
      );
      return c.json({ ok: true });
    }

    // Bind telegram ID to token
    updateTelegramAuthToken(c.env.DB, token, telegramId);

    // Build auth callback URL
    const authUrl = `https://re-search.wiki/auth/telegram-callback?token=${token}`;

    // Send inline keyboard with auth button
    await sendTelegramMessageWithButton(
      c.env.TELEGRAM_BOT_TOKEN,
      telegramId,
      "🔐 Нажмите кнопку ниже чтобы авторизоваться на сайте:",
      "Войти в DV Hub",
      authUrl,
    );

    return c.json({ ok: true });
  }

  // Acknowledge all other updates
  return c.json({ ok: true });
});

// ── Helpers ───────────────────────────────────────────────────

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}

async function sendTelegramMessageWithButton(
  botToken: string,
  chatId: string,
  text: string,
  buttonText: string,
  buttonUrl: string,
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: buttonText, url: buttonUrl }]],
        },
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram message with button:", err);
  }
}

export default webhook;
