# Task 4 — Role-Based Microservice API Ecosystem

A Docker Compose microservice demonstration containing:
- **API Gateway** (port 4300): security headers, rate limiting, JWT verification and role-based access control.
- **Users service** (port 4301): registration and login; bcrypt password hashing; JWT issuance with user/admin role.
- **Orders service** (port 4302): order creation and listing; publishes durable order.created events to RabbitMQ.
- **RabbitMQ** (ports 5672 and 15672): asynchronous message broker with management UI.
- **Event worker**: independently consumes order.events, acknowledges processed messages and writes a JSONL processing log to a Docker volume.

## Run
Requirements: Docker Engine/Desktop with Compose plugin.
1. Copy .env.example to .env and replace JWT_SECRET.
2. Start all services: docker compose up --build -d.
3. Gateway health: http://localhost:4300/health.
4. RabbitMQ dashboard: http://localhost:15672 (demo credentials: app / app_password_change_me).
5. Verify endpoints: npm test from this directory (requires Node.js 20+).

## API through gateway
| Method | Endpoint | Access |
|---|---|---|
| GET | /health | Public |
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/admin/users | Admin JWT only |
| GET | /api/orders | Authenticated |
| POST | /api/orders | User or Admin JWT |

Register JSON:
```json
{"name":"Demo User","email":"demo@example.com","password":"DemoPass123"}
```
Login with the registered account or demo admin:
```json
{"email":"admin@example.com","password":"AdminPass123!"}
```
Use the returned token as Authorization: Bearer TOKEN.

Create order:
```json
{"product":"Keyboard","quantity":2}
```
On successful creation, Orders publishes a persistent event to RabbitMQ queue order.events. The separate event worker consumes the queue with manual acknowledgements and writes processed events to the worker_events volume.

## Automated verification
Run npm test after the stack starts. The smoke test checks gateway health, rejects unauthenticated order access, logs in as seeded admin and creates an order.

## Scope and production hardening
This is an educational microservice foundation. Demo user and order stores are in-memory and reset when containers restart; replace them with persistent relational databases for production. Worker JSONL log is persisted in a Docker volume. Add service-to-service authentication, TLS, secret management, retries/dead-letter queues, tracing and full integration tests before production. Change demo admin and RabbitMQ credentials before public exposure.
