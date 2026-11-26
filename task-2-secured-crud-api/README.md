# Task 2 — Secured RESTful CRUD API Server

A runnable REST API using Node.js, Express and SQLite. Includes JWT authentication, bcrypt password hashing, Zod input validation, rate limiting, security headers and owner-scoped CRUD.

## Requirements
- Node.js 20+
- npm

## Run locally
1. Copy `.env.example` to `.env`.
2. Set `JWT_SECRET` to a long random secret.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:4000/health`.

The SQLite database is created automatically at `data/app.sqlite`.

## API
| Method | Endpoint | Auth | Purpose |
|---|---|---:|---|
| GET | `/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Receive JWT |
| GET | `/api/projects` | Yes | List your projects |
| POST | `/api/projects` | Yes | Create project |
| GET | `/api/projects/:id` | Yes | Read one project |
| PUT | `/api/projects/:id` | Yes | Update project |
| DELETE | `/api/projects/:id` | Yes | Delete project |

Register: `POST /api/auth/register`
```json
{"name":"Ayesha Khan","email":"ayesha@example.com","password":"strongpass123"}
```
Login: `POST /api/auth/login`
```json
{"email":"ayesha@example.com","password":"strongpass123"}
```
Send the returned token as `Authorization: Bearer YOUR_TOKEN` on project endpoints.

Create project: `POST /api/projects`
```json
{"title":"Portfolio API","description":"Backend project","status":"active"}
```

## Tests
Run `npm test`. Tests cover health, authentication and the protected CRUD lifecycle.

## Security
Passwords are hashed with bcrypt. JWT secret is environment-configured. Project queries are scoped to the authenticated owner. Inputs are validated with Zod. Never commit `.env` or production secrets.