require('dotenv').config();
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'realtime-hub' }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || '*' }, maxHttpBufferSize: 1e6 });

const logFile = process.env.EVENT_LOG || './data/events.jsonl';
fs.mkdirSync(path.dirname(path.resolve(logFile)), { recursive: true });
function persist(event) {
  fs.appendFile(logFile, JSON.stringify({ ...event, persistedAt: new Date().toISOString() }) + '\\n', err => {
    if (err) console.error('Could not persist event:', err.message);
  });
}

(async () => {
  if (process.env.REDIS_URL) {
    const pub = new Redis(process.env.REDIS_URL);
    const sub = pub.duplicate();
    pub.on('error', err => console.error('Redis publisher:', err.message));
    sub.on('error', err => console.error('Redis subscriber:', err.message));
    await Promise.all([pub.ping(), sub.ping()]);
    io.adapter(createAdapter(pub, sub));
    console.log('Redis Socket.IO adapter enabled');
  } else {
    console.warn('REDIS_URL missing: using single-process Socket.IO mode');
  }
})().catch(err => { console.error('Redis adapter setup failed:', err.message); process.exit(1); });

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { next(new Error('Invalid or expired token')); }
});

io.on('connection', socket => {
  const user = { id: String(socket.user.sub), name: String(socket.user.name || 'User').slice(0, 60) };
  socket.join(`user:${user.id}`);
  socket.emit('hub:ready', { user, socketId: socket.id, connectedAt: new Date().toISOString() });
  persist({ type: 'connected', userId: user.id, socketId: socket.id });

  socket.on('room:join', (payload = {}, ack = () => {}) => {
    const room = String(payload.room || '').trim();
    if (!/^[a-zA-Z0-9_-]{2,50}$/.test(room)) return ack({ ok: false, error: 'Room must be 2-50 safe characters' });
    socket.join(`room:${room}`);
    ack({ ok: true, room });
    socket.to(`room:${room}`).emit('room:user-joined', { user, room, at: new Date().toISOString() });
  });

  socket.on('chat:message', (payload = {}, ack = () => {}) => {
    const room = String(payload.room || '').trim();
    const message = String(payload.message || '').trim();
    if (!/^[a-zA-Z0-9_-]{2,50}$/.test(room) || !socket.rooms.has(`room:${room}`))
      return ack({ ok: false, error: 'Join a valid room before sending' });
    if (!message || message.length > 2000) return ack({ ok: false, error: 'Message must contain 1-2000 characters' });
    const event = { id: require('node:crypto').randomUUID(), type: 'message', room, user, message, at: new Date().toISOString() };
    io.to(`room:${room}`).emit('chat:message', event);
    persist(event);
    ack({ ok: true, id: event.id });
  });

  socket.on('disconnect', reason => persist({ type: 'disconnected', userId: user.id, socketId: socket.id, reason }));
});

const port = process.env.PORT || 4100;
server.listen(port, () => console.log(`Realtime hub listening on http://localhost:${port}`));
