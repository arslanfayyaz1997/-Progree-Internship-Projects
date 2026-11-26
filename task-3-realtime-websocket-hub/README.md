# Task 3 — Concurrent WebSocket Real-Time Communication Hub

Authenticated real-time messaging backend built with Socket.IO. Supports rooms, message acknowledgements, Redis pub/sub scaling across server instances and a JSON Lines event log.

## Requirements
- Node.js 20+
- Docker Engine/Desktop for Redis

## Start
1. Copy .env.example to .env and set a strong JWT_SECRET.
2. Start Redis: docker compose up -d redis.
3. Install packages: npm install.
4. Start the hub: npm start.
5. Check http://localhost:4100/health.

## Authentication
Socket clients provide a JWT in the Socket.IO handshake:
```js
const { io } = require("socket.io-client");
const socket = io("http://localhost:4100", { auth: { token: "YOUR_JWT" } });
```
Create a local test token using the same JWT_SECRET:
```js
const jwt = require("jsonwebtoken");
console.log(jwt.sign({ sub: "user-1", name: "Demo User" }, process.env.JWT_SECRET));
```

## Events
| Direction | Event | Payload |
|---|---|---|
| Client → Server | room:join | { room: "general" } |
| Client → Server | chat:message | { room: "general", message: "Hello" } |
| Server → Client | hub:ready | authenticated connection details |
| Server → Room | chat:message | message ID, sender, room, text, timestamp |
| Server → Room | room:user-joined | joining user and timestamp |

Join a room before sending. Room names allow 2–50 alphanumeric, underscore or hyphen characters. Messages are limited to 2,000 characters.

## Event log
Events append to data/events.jsonl with persistence timestamps. Mount data to persistent storage in deployment.

## Client demo
Set TOKEN to a JWT signed with JWT_SECRET and run:
```bash
TOKEN="paste-token-here" node examples/client.js
```

## Scaling
Run multiple service instances against the same Redis instance. The Redis adapter broadcasts Socket.IO room events across instances. Use managed Redis with authentication, TLS and monitoring in production.
