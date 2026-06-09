import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";
import { authMiddleware, requireRole } from "../lib/auth";
import type { Env } from "../lib/auth";

const api = new Hono<{
  Bindings: Env["Bindings"];
  Variables: Env["Variables"];
}>();

api.use("/*", cors());
api.use("/*", authMiddleware);

// ── DASHBOARD ──────────────────────────────────────────────
api.get("/dashboard", async (c) => {
  const db = c.env.DB;
  const topics = db
    .prepare(
      `SELECT t.*, u.name as owner_name FROM topics t LEFT JOIN users u ON t.owner_id = u.id WHERE t.status NOT IN ('archive') ORDER BY t.priority DESC, t.updated_at DESC LIMIT 5`,
    )
    .all();
  const materials = db
    .prepare(
      `SELECT m.*, u.name as author_name FROM materials m LEFT JOIN users u ON m.author_id = u.id WHERE m.status != 'archive' ORDER BY m.created_at DESC LIMIT 5`,
    )
    .all();
  const rooms = db
    .prepare(
      `SELECT r.*, t.title as topic_title FROM discussion_rooms r LEFT JOIN topics t ON r.topic_id = t.id WHERE r.status IN ('preparing','active') ORDER BY r.scheduled_at ASC LIMIT 5`,
    )
    .all();
  const publications = db
    .prepare(`SELECT * FROM publications ORDER BY created_at DESC LIMIT 5`)
    .all();

  return c.json({ topics, materials, rooms, publications });
});

// ── MATERIALS ──────────────────────────────────────────────
api.get("/materials", async (c) => {
  const status = c.req.query("status") || "";
  const q = status
    ? `SELECT m.*, u.name as author_name, t.title as topic_title FROM materials m LEFT JOIN users u ON m.author_id = u.id LEFT JOIN topics t ON m.topic_id = t.id WHERE m.status = ? ORDER BY m.created_at DESC`
    : `SELECT m.*, u.name as author_name, t.title as topic_title FROM materials m LEFT JOIN users u ON m.author_id = u.id LEFT JOIN topics t ON m.topic_id = t.id ORDER BY m.created_at DESC`;
  const result = status
    ? c.env.DB.prepare(q).all(status)
    : c.env.DB.prepare(q).all();
  return c.json(result);
});

api.post("/materials", async (c) => {
  const body = await c.req.json();
  const {
    title,
    url,
    content,
    description,
    type = "link",
    tags = [],
    author_id,
    topic_id,
  } = body;
  const status = topic_id ? "linked" : "raw";
  const result = c.env.DB.prepare(
    `INSERT INTO materials (title, url, content, description, type, tags, author_id, topic_id, status) VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(
    title,
    url || null,
    content || null,
    description || null,
    type,
    JSON.stringify(tags),
    author_id || null,
    topic_id || null,
    status,
  );
  return c.json({ id: Number(result.lastInsertRowid), ...body }, 201);
});

api.patch("/materials/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const fields = Object.keys(body).filter((k) =>
    [
      "title",
      "url",
      "description",
      "type",
      "tags",
      "status",
      "topic_id",
    ].includes(k),
  );
  if (!fields.length)
    return c.json({ error: { code: 400, message: "nothing to update" } }, 400);
  const set = fields.map((f) => `${f} = ?`).join(", ");
  const vals = fields.map((f) =>
    f === "tags" ? JSON.stringify(body[f]) : body[f],
  );
  c.env.DB.prepare(
    `UPDATE materials SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  ).run(...vals, id);
  return c.json({ ok: true });
});

api.delete("/materials/:id", async (c) => {
  c.env.DB.prepare(`UPDATE materials SET status = 'archive' WHERE id = ?`).run(
    c.req.param("id"),
  );
  return c.json({ ok: true });
});

api.delete("/materials/:id/permanent", async (c) => {
  c.env.DB.prepare(`DELETE FROM materials WHERE id = ?`).run(c.req.param("id"));
  return c.json({ ok: true });
});

// ── TOPICS ──────────────────────────────────────────────────
api.get("/topics", async (c) => {
  const status = c.req.query("status") || "";
  const q = status
    ? `SELECT t.*, u.name as owner_name, COUNT(DISTINCT m.id) as material_count, COUNT(DISTINCT r.id) as room_count FROM topics t LEFT JOIN users u ON t.owner_id = u.id LEFT JOIN materials m ON m.topic_id = t.id LEFT JOIN discussion_rooms r ON r.topic_id = t.id WHERE t.status = ? GROUP BY t.id ORDER BY t.priority DESC, t.updated_at DESC`
    : `SELECT t.*, u.name as owner_name, COUNT(DISTINCT m.id) as material_count, COUNT(DISTINCT r.id) as room_count FROM topics t LEFT JOIN users u ON t.owner_id = u.id LEFT JOIN materials m ON m.topic_id = t.id LEFT JOIN discussion_rooms r ON r.topic_id = t.id GROUP BY t.id ORDER BY t.priority DESC, t.updated_at DESC`;
  const result = status
    ? c.env.DB.prepare(q).all(status)
    : c.env.DB.prepare(q).all();
  return c.json(result);
});

api.get("/topics/:id", async (c) => {
  const id = c.req.param("id");
  const topic = c.env.DB.prepare(
    `SELECT t.*, u.name as owner_name FROM topics t LEFT JOIN users u ON t.owner_id = u.id WHERE t.id = ?`,
  ).get(id);
  const materials = c.env.DB.prepare(
    `SELECT * FROM materials WHERE topic_id = ? ORDER BY created_at DESC`,
  ).all(id);
  const rooms = c.env.DB.prepare(
    `SELECT * FROM discussion_rooms WHERE topic_id = ? ORDER BY scheduled_at DESC`,
  ).all(id);
  const publications = c.env.DB.prepare(
    `SELECT * FROM publications WHERE topic_id = ? ORDER BY created_at DESC`,
  ).all(id);

  if (!topic)
    return c.json({ error: { code: 404, message: "not found" } }, 404);
  return c.json({
    ...(topic as Record<string, unknown>),
    materials,
    rooms,
    publications,
  });
});

api.post("/topics", async (c) => {
  const body = await c.req.json();
  const {
    title,
    question,
    thesis,
    antithesis,
    priority = "medium",
    tags = [],
    owner_id,
    is_public = 0,
  } = body;
  const result = c.env.DB.prepare(
    `INSERT INTO topics (title, question, thesis, antithesis, priority, tags, owner_id, is_public) VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    title,
    question || null,
    thesis || null,
    antithesis || null,
    priority,
    JSON.stringify(tags),
    owner_id || null,
    is_public,
  );
  return c.json({ id: Number(result.lastInsertRowid), ...body }, 201);
});

api.patch("/topics/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const fields = Object.keys(body).filter((k) =>
    [
      "title",
      "question",
      "thesis",
      "antithesis",
      "synthesis",
      "status",
      "priority",
      "tags",
      "owner_id",
      "is_public",
    ].includes(k),
  );
  if (!fields.length)
    return c.json({ error: { code: 400, message: "nothing to update" } }, 400);
  const set = fields.map((f) => `${f} = ?`).join(", ");
  const vals = fields.map((f) =>
    f === "tags" ? JSON.stringify(body[f]) : body[f],
  );
  c.env.DB.prepare(
    `UPDATE topics SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  ).run(...vals, id);
  return c.json({ ok: true });
});

api.delete("/topics/:id", async (c) => {
  const id = c.req.param("id");
  c.env.DB.prepare(
    `UPDATE materials SET topic_id = NULL, status = 'raw' WHERE topic_id = ?`,
  ).run(id);
  const rooms = c.env.DB.prepare(
    `SELECT id FROM discussion_rooms WHERE topic_id = ?`,
  ).all(id) as Array<{ id: number }>;
  for (const r of rooms) {
    c.env.DB.prepare(`DELETE FROM messages WHERE room_id = ?`).run(r.id);
  }
  c.env.DB.prepare(`DELETE FROM discussion_rooms WHERE topic_id = ?`).run(id);
  c.env.DB.prepare(`DELETE FROM publications WHERE topic_id = ?`).run(id);
  c.env.DB.prepare(`DELETE FROM topics WHERE id = ?`).run(id);
  return c.json({ ok: true });
});

// ── DISCUSSION ROOMS ─────────────────────────────────────────
api.get("/rooms", async (c) => {
  const status = c.req.query("status") || "";
  const q = status
    ? `SELECT r.*, t.title as topic_title FROM discussion_rooms r LEFT JOIN topics t ON r.topic_id = t.id WHERE r.status = ? ORDER BY r.scheduled_at DESC`
    : `SELECT r.*, t.title as topic_title FROM discussion_rooms r LEFT JOIN topics t ON r.topic_id = t.id ORDER BY r.scheduled_at DESC`;
  const result = status
    ? c.env.DB.prepare(q).all(status)
    : c.env.DB.prepare(q).all();
  return c.json(result);
});

api.get("/rooms/:id", async (c) => {
  const id = c.req.param("id");
  const room = c.env.DB.prepare(
    `SELECT r.*, t.title as topic_title FROM discussion_rooms r LEFT JOIN topics t ON r.topic_id = t.id WHERE r.id = ?`,
  ).get(id);
  const materials = c.env.DB.prepare(
    `SELECT * FROM materials WHERE topic_id = (SELECT topic_id FROM discussion_rooms WHERE id = ?) ORDER BY created_at DESC`,
  ).all(id);
  const publications = c.env.DB.prepare(
    `SELECT * FROM publications WHERE room_id = ? ORDER BY created_at DESC`,
  ).all(id);

  if (!room) return c.json({ error: { code: 404, message: "not found" } }, 404);
  return c.json({
    ...(room as Record<string, unknown>),
    materials,
    publications,
  });
});

api.post("/rooms", async (c) => {
  const body = await c.req.json();
  const {
    topic_id,
    title,
    description,
    scheduled_at,
    is_public = 0,
    created_by,
  } = body;
  const result = c.env.DB.prepare(
    `INSERT INTO discussion_rooms (topic_id, title, description, scheduled_at, is_public, created_by) VALUES (?,?,?,?,?,?)`,
  ).run(
    topic_id || null,
    title,
    description || null,
    scheduled_at || null,
    is_public,
    created_by || null,
  );
  return c.json({ id: Number(result.lastInsertRowid), ...body }, 201);
});

api.patch("/rooms/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const fields = Object.keys(body).filter((k) =>
    [
      "title",
      "description",
      "scheduled_at",
      "status",
      "notes",
      "thesis",
      "antithesis",
      "synthesis",
      "outcomes",
      "tasks",
      "is_public",
      "participants",
    ].includes(k),
  );
  if (!fields.length)
    return c.json({ error: { code: 400, message: "nothing to update" } }, 400);
  const set = fields.map((f) => `${f} = ?`).join(", ");
  const vals = fields.map((f) =>
    ["tasks", "participants"].includes(f) ? JSON.stringify(body[f]) : body[f],
  );
  c.env.DB.prepare(
    `UPDATE discussion_rooms SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  ).run(...vals, id);
  return c.json({ ok: true });
});

api.delete("/rooms/:id", async (c) => {
  const id = c.req.param("id");
  c.env.DB.prepare(`DELETE FROM messages WHERE room_id = ?`).run(id);
  c.env.DB.prepare(`DELETE FROM publications WHERE room_id = ?`).run(id);
  c.env.DB.prepare(`DELETE FROM discussion_rooms WHERE id = ?`).run(id);
  return c.json({ ok: true });
});

// ── PUBLICATIONS ─────────────────────────────────────────────
api.get("/publications", async (c) => {
  const result = c.env.DB.prepare(
    `SELECT p.*, t.title as topic_title, r.title as room_title FROM publications p LEFT JOIN topics t ON p.topic_id = t.id LEFT JOIN discussion_rooms r ON p.room_id = r.id ORDER BY p.created_at DESC`,
  ).all();
  return c.json(result);
});

api.post("/publications", async (c) => {
  const body = await c.req.json();
  const {
    title,
    url,
    platform = "other",
    type = "video",
    description,
    topic_id,
    room_id,
    published_at,
  } = body;
  let thumbnail_url = null;
  if (platform === "youtube" && url) {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match)
      thumbnail_url = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  const result = c.env.DB.prepare(
    `INSERT INTO publications (title, url, platform, type, description, thumbnail_url, topic_id, room_id, published_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(
    title,
    url,
    platform,
    type,
    description || null,
    thumbnail_url,
    topic_id || null,
    room_id || null,
    published_at || null,
  );
  return c.json(
    { id: Number(result.lastInsertRowid), ...body, thumbnail_url },
    201,
  );
});

api.delete("/publications/:id", async (c) => {
  c.env.DB.prepare(`DELETE FROM publications WHERE id = ?`).run(
    c.req.param("id"),
  );
  return c.json({ ok: true });
});

// ── PUBLIC IDEA SUBMISSION ────────────────────────────────────
api.post("/submit-idea", async (c) => {
  const body = await c.req.json();
  const { title, url, description, contact } = body;
  if (!title)
    return c.json({ error: { code: 400, message: "title required" } }, 400);
  const note = contact
    ? `[от: ${contact}]\n${description || ""}`
    : description || null;
  c.env.DB.prepare(
    `INSERT INTO materials (title, url, description, type, status, tags) VALUES (?,?,?,'idea','raw','["submitted"]')`,
  ).run(title, url || null, note);
  return c.json({ ok: true, message: "Идея принята. Спасибо!" });
});

// ── USERS ─────────────────────────────────────────────────────
api.get("/users", async (c) => {
  const result = c.env.DB.prepare(
    `SELECT id, name, role, created_at, last_seen FROM users ORDER BY created_at ASC`,
  ).all();
  return c.json(result);
});

// ── ADMIN ─────────────────────────────────────────────────────
api.get("/admin/users", requireRole("admin"), async (c) => {
  const result = c.env.DB.prepare(
    `SELECT id, name, telegram_id, email, avatar_url, role, cell_id, created_at, last_seen FROM users ORDER BY created_at ASC`,
  ).all();
  return c.json(result);
});

api.patch("/admin/users/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const fields = Object.keys(body).filter((k) =>
    ["name", "role", "email"].includes(k),
  );
  if (!fields.length)
    return c.json({ error: { code: 400, message: "nothing to update" } }, 400);
  const set = fields.map((f) => `${f} = ?`).join(", ");
  const vals = fields.map((f) => body[f]);
  c.env.DB.prepare(`UPDATE users SET ${set} WHERE id = ?`).run(...vals, id);
  return c.json({ ok: true });
});

api.delete("/admin/users/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  c.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
  c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  return c.json({ ok: true });
});

// ── PROFILE ───────────────────────────────────────────────────
api.get("/profile", async (c) => {
  const sessionId = getCookie(c, "session");
  if (!sessionId)
    return c.json({ error: { code: 401, message: "unauthorized" } }, 401);
  const user = c.env.DB.prepare(
    `SELECT u.id, u.name, u.telegram_id, u.email, u.avatar_url, u.role, u.created_at, u.last_seen
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`,
  ).get(sessionId);
  if (!user)
    return c.json({ error: { code: 401, message: "unauthorized" } }, 401);
  return c.json(user);
});

api.patch("/profile", async (c) => {
  const sessionId = getCookie(c, "session");
  if (!sessionId)
    return c.json({ error: { code: 401, message: "unauthorized" } }, 401);
  const session = c.env.DB.prepare(
    `SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')`,
  ).get(sessionId) as { user_id: number } | undefined;
  if (!session)
    return c.json({ error: { code: 401, message: "unauthorized" } }, 401);
  const body = await c.req.json();
  const fields = Object.keys(body).filter((k) => ["name"].includes(k));
  if (!fields.length)
    return c.json({ error: { code: 400, message: "nothing to update" } }, 400);
  const set = fields.map((f) => `${f} = ?`).join(", ");
  const vals = fields.map((f) => body[f]);
  c.env.DB.prepare(`UPDATE users SET ${set} WHERE id = ?`).run(
    ...vals,
    session.user_id,
  );
  return c.json({ ok: true });
});

// ── CHAT MESSAGES ─────────────────────────────────────────────
api.get("/rooms/:id/messages", async (c) => {
  const roomId = c.req.param("id");
  const result = c.env.DB.prepare(
    `SELECT m.*, u.name as author_name, u.avatar_url as author_avatar, u.role as author_role
     FROM messages m LEFT JOIN users u ON m.user_id = u.id
     WHERE m.room_id = ? ORDER BY m.created_at ASC`,
  ).all(roomId);
  return c.json(result);
});

api.post("/rooms/:id/messages", async (c) => {
  const roomId = c.req.param("id");
  const { text, user_id } = await c.req.json();
  if (!text || !text.trim())
    return c.json({ error: { code: 400, message: "empty message" } }, 400);
  const result = c.env.DB.prepare(
    `INSERT INTO messages (room_id, user_id, text) VALUES (?, ?, ?)`,
  ).run(roomId, user_id || null, text.trim());
  return c.json({ id: Number(result.lastInsertRowid) }, 201);
});

export default api;
