
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database
}

const api = new Hono<{ Bindings: Bindings }>()

api.use('/*', cors())

// ── DASHBOARD ──────────────────────────────────────────────
api.get('/dashboard', async (c) => {
  const db = c.env.DB
  const [topics, materials, rooms, publications] = await Promise.all([
    db.prepare(`SELECT t.*, u.name as owner_name FROM topics t LEFT JOIN users u ON t.owner_id = u.id WHERE t.status NOT IN ('archive') ORDER BY t.priority DESC, t.updated_at DESC LIMIT 5`).all(),
    db.prepare(`SELECT m.*, u.name as author_name FROM materials m LEFT JOIN users u ON m.author_id = u.id WHERE m.status != 'archive' ORDER BY m.created_at DESC LIMIT 5`).all(),
    db.prepare(`SELECT r.*, t.title as topic_title FROM discussion_rooms r LEFT JOIN topics t ON r.topic_id = t.id WHERE r.status IN ('preparing','active') ORDER BY r.scheduled_at ASC LIMIT 5`).all(),
    db.prepare(`SELECT * FROM publications ORDER BY created_at DESC LIMIT 5`).all(),
  ])
  return c.json({ topics: topics.results, materials: materials.results, rooms: rooms.results, publications: publications.results })
})

// ── MATERIALS ──────────────────────────────────────────────
api.get('/materials', async (c) => {
  const status = c.req.query('status') || ''
  const q = status
    ? `SELECT m.*, u.name as author_name, t.title as topic_title FROM materials m LEFT JOIN users u ON m.author_id = u.id LEFT JOIN topics t ON m.topic_id = t.id WHERE m.status = ? ORDER BY m.created_at DESC`
    : `SELECT m.*, u.name as author_name, t.title as topic_title FROM materials m LEFT JOIN users u ON m.author_id = u.id LEFT JOIN topics t ON m.topic_id = t.id ORDER BY m.created_at DESC`
  const result = status
    ? await c.env.DB.prepare(q).bind(status).all()
    : await c.env.DB.prepare(q).all()
  return c.json(result.results)
})

api.post('/materials', async (c) => {
  const body = await c.req.json()
  const { title, url, content, description, type = 'link', tags = [], author_id, topic_id } = body
  const status = topic_id ? 'linked' : 'raw'
  const result = await c.env.DB.prepare(
    `INSERT INTO materials (title, url, content, description, type, tags, author_id, topic_id, status) VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(title, url || null, content || null, description || null, type, JSON.stringify(tags), author_id || null, topic_id || null, status).run()
  return c.json({ id: result.meta.last_row_id, ...body }, 201)
})

api.patch('/materials/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields = Object.keys(body).filter(k => ['title','url','description','type','tags','status','topic_id'].includes(k))
  if (!fields.length) return c.json({ error: 'nothing to update' }, 400)
  const set = fields.map(f => `${f} = ?`).join(', ')
  const vals = fields.map(f => f === 'tags' ? JSON.stringify(body[f]) : body[f])
  await c.env.DB.prepare(`UPDATE materials SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...vals, id).run()
  return c.json({ ok: true })
})

api.delete('/materials/:id', async (c) => {
  await c.env.DB.prepare(`UPDATE materials SET status = 'archive' WHERE id = ?`).bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

api.delete('/materials/:id/permanent', async (c) => {
  await c.env.DB.prepare(`DELETE FROM materials WHERE id = ?`).bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ── TOPICS ──────────────────────────────────────────────────
api.get('/topics', async (c) => {
  const status = c.req.query('status') || ''
  const q = status
    ? `SELECT t.*, u.name as owner_name, COUNT(DISTINCT m.id) as material_count, COUNT(DISTINCT r.id) as room_count FROM topics t LEFT JOIN users u ON t.owner_id = u.id LEFT JOIN materials m ON m.topic_id = t.id LEFT JOIN discussion_rooms r ON r.topic_id = t.id WHERE t.status = ? GROUP BY t.id ORDER BY t.priority DESC, t.updated_at DESC`
    : `SELECT t.*, u.name as owner_name, COUNT(DISTINCT m.id) as material_count, COUNT(DISTINCT r.id) as room_count FROM topics t LEFT JOIN users u ON t.owner_id = u.id LEFT JOIN materials m ON m.topic_id = t.id LEFT JOIN discussion_rooms r ON r.topic_id = t.id GROUP BY t.id ORDER BY t.priority DESC, t.updated_at DESC`
  const result = status
    ? await c.env.DB.prepare(q).bind(status).all()
    : await c.env.DB.prepare(q).all()
  return c.json(result.results)
})

api.get('/topics/:id', async (c) => {
  const id = c.req.param('id')
  const [topic, materials, rooms, publications] = await Promise.all([
    c.env.DB.prepare(`SELECT t.*, u.name as owner_name FROM topics t LEFT JOIN users u ON t.owner_id = u.id WHERE t.id = ?`).bind(id).first(),
    c.env.DB.prepare(`SELECT * FROM materials WHERE topic_id = ? ORDER BY created_at DESC`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM discussion_rooms WHERE topic_id = ? ORDER BY scheduled_at DESC`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM publications WHERE topic_id = ? ORDER BY created_at DESC`).bind(id).all(),
  ])
  if (!topic) return c.json({ error: 'not found' }, 404)
  return c.json({ ...topic, materials: materials.results, rooms: rooms.results, publications: publications.results })
})

api.post('/topics', async (c) => {
  const body = await c.req.json()
  const { title, question, thesis, antithesis, priority = 'medium', tags = [], owner_id, is_public = 0 } = body
  const result = await c.env.DB.prepare(
    `INSERT INTO topics (title, question, thesis, antithesis, priority, tags, owner_id, is_public) VALUES (?,?,?,?,?,?,?,?)`
  ).bind(title, question || null, thesis || null, antithesis || null, priority, JSON.stringify(tags), owner_id || null, is_public).run()
  return c.json({ id: result.meta.last_row_id, ...body }, 201)
})

api.patch('/topics/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields = Object.keys(body).filter(k => ['title','question','thesis','antithesis','synthesis','status','priority','tags','owner_id','is_public'].includes(k))
  if (!fields.length) return c.json({ error: 'nothing to update' }, 400)
  const set = fields.map(f => `${f} = ?`).join(', ')
  const vals = fields.map(f => f === 'tags' ? JSON.stringify(body[f]) : body[f])
  await c.env.DB.prepare(`UPDATE topics SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...vals, id).run()
  return c.json({ ok: true })
})

api.delete('/topics/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(`UPDATE materials SET topic_id = NULL, status = 'raw' WHERE topic_id = ?`).bind(id).run()
  const rooms = await c.env.DB.prepare(`SELECT id FROM discussion_rooms WHERE topic_id = ?`).bind(id).all()
  for (const r of rooms.results) {
    await c.env.DB.prepare(`DELETE FROM messages WHERE room_id = ?`).bind(r.id).run()
  }
  await c.env.DB.prepare(`DELETE FROM discussion_rooms WHERE topic_id = ?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM publications WHERE topic_id = ?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM topics WHERE id = ?`).bind(id).run()
  return c.json({ ok: true })
})

// ── DISCUSSION ROOMS ─────────────────────────────────────────
api.get('/rooms', async (c) => {
  const status = c.req.query('status') || ''
  const q = status
    ? `SELECT r.*, t.title as topic_title FROM discussion_rooms r LEFT JOIN topics t ON r.topic_id = t.id WHERE r.status = ? ORDER BY r.scheduled_at DESC`
    : `SELECT r.*, t.title as topic_title FROM discussion_rooms r LEFT JOIN topics t ON r.topic_id = t.id ORDER BY r.scheduled_at DESC`
  const result = status
    ? await c.env.DB.prepare(q).bind(status).all()
    : await c.env.DB.prepare(q).all()
  return c.json(result.results)
})

api.get('/rooms/:id', async (c) => {
  const id = c.req.param('id')
  const [room, materials, publications] = await Promise.all([
    c.env.DB.prepare(`SELECT r.*, t.title as topic_title FROM discussion_rooms r LEFT JOIN topics t ON r.topic_id = t.id WHERE r.id = ?`).bind(id).first(),
    c.env.DB.prepare(`SELECT * FROM materials WHERE topic_id = (SELECT topic_id FROM discussion_rooms WHERE id = ?) ORDER BY created_at DESC`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM publications WHERE room_id = ? ORDER BY created_at DESC`).bind(id).all(),
  ])
  if (!room) return c.json({ error: 'not found' }, 404)
  return c.json({ ...room, materials: materials.results, publications: publications.results })
})

api.post('/rooms', async (c) => {
  const body = await c.req.json()
  const { topic_id, title, description, scheduled_at, is_public = 0, created_by } = body
  const result = await c.env.DB.prepare(
    `INSERT INTO discussion_rooms (topic_id, title, description, scheduled_at, is_public, created_by) VALUES (?,?,?,?,?,?)`
  ).bind(topic_id || null, title, description || null, scheduled_at || null, is_public, created_by || null).run()
  return c.json({ id: result.meta.last_row_id, ...body }, 201)
})

api.patch('/rooms/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields = Object.keys(body).filter(k => ['title','description','scheduled_at','status','notes','thesis','antithesis','synthesis','outcomes','tasks','is_public','participants'].includes(k))
  if (!fields.length) return c.json({ error: 'nothing to update' }, 400)
  const set = fields.map(f => `${f} = ?`).join(', ')
  const vals = fields.map(f => ['tasks','participants'].includes(f) ? JSON.stringify(body[f]) : body[f])
  await c.env.DB.prepare(`UPDATE discussion_rooms SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...vals, id).run()
  return c.json({ ok: true })
})

api.delete('/rooms/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(`DELETE FROM messages WHERE room_id = ?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM publications WHERE room_id = ?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM discussion_rooms WHERE id = ?`).bind(id).run()
  return c.json({ ok: true })
})

// ── PUBLICATIONS ─────────────────────────────────────────────
api.get('/publications', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT p.*, t.title as topic_title, r.title as room_title FROM publications p LEFT JOIN topics t ON p.topic_id = t.id LEFT JOIN discussion_rooms r ON p.room_id = r.id ORDER BY p.created_at DESC`
  ).all()
  return c.json(result.results)
})

api.post('/publications', async (c) => {
  const body = await c.req.json()
  const { title, url, platform = 'other', type = 'video', description, topic_id, room_id, published_at } = body
  let thumbnail_url = null
  if (platform === 'youtube' && url) {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    if (match) thumbnail_url = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
  }
  const result = await c.env.DB.prepare(
    `INSERT INTO publications (title, url, platform, type, description, thumbnail_url, topic_id, room_id, published_at) VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(title, url, platform, type, description || null, thumbnail_url, topic_id || null, room_id || null, published_at || null).run()
  return c.json({ id: result.meta.last_row_id, ...body, thumbnail_url }, 201)
})

api.delete('/publications/:id', async (c) => {
  await c.env.DB.prepare(`DELETE FROM publications WHERE id = ?`).bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ── PUBLIC IDEA SUBMISSION ────────────────────────────────────
api.post('/submit-idea', async (c) => {
  const body = await c.req.json()
  const { title, url, description, contact } = body
  if (!title) return c.json({ error: 'title required' }, 400)
  const note = contact ? `[от: ${contact}]\n${description || ''}` : (description || null)
  await c.env.DB.prepare(
    `INSERT INTO materials (title, url, description, type, status, tags) VALUES (?,?,?,'idea','raw','["submitted"]')`
  ).bind(title, url || null, note).run()
  return c.json({ ok: true, message: 'Идея принята. Спасибо!' })
})

// ── USERS ─────────────────────────────────────────────────────
api.get('/users', async (c) => {
  const result = await c.env.DB.prepare(`SELECT id, name, role, created_at, last_seen FROM users ORDER BY created_at ASC`).all()
  return c.json(result.results)
})

// ── ADMIN ─────────────────────────────────────────────────────
api.get('/admin/users', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id, name, telegram_id, email, avatar_url, role, cell_id, created_at, last_seen FROM users ORDER BY created_at ASC`
  ).all()
  return c.json(result.results)
})

api.patch('/admin/users/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields = Object.keys(body).filter(k => ['name', 'role', 'email'].includes(k))
  if (!fields.length) return c.json({ error: 'nothing to update' }, 400)
  const set = fields.map(f => `${f} = ?`).join(', ')
  const vals = fields.map(f => body[f])
  await c.env.DB.prepare(`UPDATE users SET ${set} WHERE id = ?`).bind(...vals, id).run()
  return c.json({ ok: true })
})

api.delete('/admin/users/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run()
  return c.json({ ok: true })
})

// ── PROFILE ───────────────────────────────────────────────────
api.get('/profile', async (c) => {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) return c.json({ error: 'unauthorized' }, 401)
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.telegram_id, u.email, u.avatar_url, u.role, u.created_at, u.last_seen
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`
  ).bind(sessionId).first()
  if (!user) return c.json({ error: 'unauthorized' }, 401)
  return c.json(user)
})

api.patch('/profile', async (c) => {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) return c.json({ error: 'unauthorized' }, 401)
  const session = await c.env.DB.prepare(
    `SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')`
  ).bind(sessionId).first()
  if (!session) return c.json({ error: 'unauthorized' }, 401)
  const body = await c.req.json()
  const fields = Object.keys(body).filter(k => ['name'].includes(k))
  if (!fields.length) return c.json({ error: 'nothing to update' }, 400)
  const set = fields.map(f => `${f} = ?`).join(', ')
  const vals = fields.map(f => body[f])
  await c.env.DB.prepare(`UPDATE users SET ${set} WHERE id = ?`).bind(...vals, session.user_id).run()
  return c.json({ ok: true })
})

// ── CHAT MESSAGES ─────────────────────────────────────────────
api.get('/rooms/:id/messages', async (c) => {
  const roomId = c.req.param('id')
  const result = await c.env.DB.prepare(
    `SELECT m.*, u.name as author_name, u.avatar_url as author_avatar, u.role as author_role
     FROM messages m LEFT JOIN users u ON m.user_id = u.id
     WHERE m.room_id = ? ORDER BY m.created_at ASC`
  ).bind(roomId).all()
  return c.json(result.results)
})

api.post('/rooms/:id/messages', async (c) => {
  const roomId = c.req.param('id')
  const { text, user_id } = await c.req.json()
  if (!text || !text.trim()) return c.json({ error: 'empty message' }, 400)
  const result = await c.env.DB.prepare(
    `INSERT INTO messages (room_id, user_id, text) VALUES (?, ?, ?)`
  ).bind(roomId, user_id || null, text.trim()).run()
  return c.json({ id: result.meta.last_row_id }, 201)
})

export default api
