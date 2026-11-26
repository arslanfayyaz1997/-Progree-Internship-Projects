const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('./db');
const auth = require('./middleware/auth');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: 'draft-7', legacyHeaders: false }));

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(100)
});
const projectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().default(''),
  status: z.enum(['active', 'archived']).optional().default('active')
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'secured-crud-api' }));

app.post('/api/auth/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  const { name, email, password } = parsed.data;
  try {
    const result = db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)')
      .run(name, email.toLowerCase(), bcrypt.hashSync(password, 12));
    return res.status(201).json({ id: result.lastInsertRowid, name, email: email.toLowerCase() });
  } catch (err) {
    if (String(err.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'Email already registered' });
    throw err;
  }
});

app.post('/api/auth/login', (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Valid email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email.toLowerCase());
  if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
  res.json({ token, tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
});

app.use('/api/projects', auth);

app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT id,title,description,status,created_at,updated_at FROM projects WHERE owner_id=? ORDER BY id DESC').all(req.user.sub);
  res.json({ data: projects, count: projects.length });
});

app.post('/api/projects', (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  const { title, description, status } = parsed.data;
  const result = db.prepare('INSERT INTO projects (owner_id,title,description,status) VALUES (?,?,?,?)')
    .run(req.user.sub, title, description, status);
  res.status(201).json({ data: db.prepare('SELECT id,title,description,status,created_at,updated_at FROM projects WHERE id=?').get(result.lastInsertRowid) });
});

app.get('/api/projects/:id', (req, res) => {
  const item = db.prepare('SELECT id,title,description,status,created_at,updated_at FROM projects WHERE id=? AND owner_id=?')
    .get(Number(req.params.id), req.user.sub);
  if (!item) return res.status(404).json({ error: 'Project not found' });
  res.json({ data: item });
});

app.put('/api/projects/:id', (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  const { title, description, status } = parsed.data;
  const result = db.prepare(`UPDATE projects SET title=?,description=?,status=?,updated_at=datetime('now') WHERE id=? AND owner_id=?`)
    .run(title, description, status, Number(req.params.id), req.user.sub);
  if (!result.changes) return res.status(404).json({ error: 'Project not found' });
  res.json({ data: db.prepare('SELECT id,title,description,status,created_at,updated_at FROM projects WHERE id=?').get(Number(req.params.id)) });
});

app.delete('/api/projects/:id', (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id=? AND owner_id=?').run(Number(req.params.id), req.user.sub);
  if (!result.changes) return res.status(404).json({ error: 'Project not found' });
  res.status(204).end();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
module.exports = app;