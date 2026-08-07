# Virtual Event Management Platform

A full-stack virtual event management platform: a RESTful Express backend and a server-rendered Next.js frontend. Users register and log in with JWT-based authentication (passwords hashed with bcrypt), organizers create and manage events, and attendees register for them. Emails are sent asynchronously on signup and on event registration.

The repo has two apps:

- **Backend** (repo root): Express 5 REST API — everything below until the Frontend section.
- **Frontend** ([web/](web)): Next.js 16 App Router app, fully server-rendered, that consumes every backend endpoint.

## Tech stack

- **Node.js + Express 5** (TypeScript 7), optional cluster mode for multi-core scaling
- **MongoDB** with **Mongoose 9** (registrations enforced by a unique compound index — no race conditions)
- **Redis (optional)** — read-through cache for event reads, distributed rate limiting, and the email job queue. Everything degrades gracefully to in-process behavior when `REDIS_URL` is unset
- **BullMQ** — durable email queue with retries, processed by a separate worker (`npm run worker`)
- **bcrypt** for password hashing, **jsonwebtoken** for stateless auth tokens
- **Nodemailer** for emails (auto-provisioned [Ethereal](https://ethereal.email) test account, or your own SMTP via `.env`)
- **Jest 30 + Supertest + mongodb-memory-server** for tests (no local MongoDB or Redis needed to run the test suite)

## Running locally

### Prerequisites

- **Node.js 20+** and npm
- **MongoDB** — any one of: Docker (compose file included), a local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **Docker** (optional) — for the bundled MongoDB + Redis; Redis itself is optional (the app falls back to in-process behavior without it)

> `npm run test` needs **none** of the above besides Node — tests spin up their own in-memory MongoDB.

### 1. Install dependencies (both apps)

```bash
npm install                # backend (repo root)
npm --prefix web install   # frontend (web/)
```

### 2. Configure environment

```bash
cp .env.example .env           # backend config
cp web/.env.example web/.env   # frontend config (BACKEND_URL=http://localhost:3000)
```

The defaults work out of the box with the Docker setup below. If you use Atlas or a local `mongod` instead, set `MONGODB_URI` in `.env` accordingly.

Also set a real `JWT_SECRET` (generate one with `openssl rand -hex 32`) — the built-in fallback is insecure and for quick local hacking only.

### 3. Start MongoDB (and optionally Redis)

```bash
docker compose up -d
```

This starts MongoDB as a single-node replica set (self-initializing) and Redis. Then point `.env` at them:

```
MONGODB_URI=mongodb://127.0.0.1:27017/virtual-events?directConnection=true
REDIS_URL=redis://127.0.0.1:6379
```

Leave `REDIS_URL` unset to run without Redis — caching, rate limiting, and email sending then use in-process fallbacks, which is fine for local development. **If you do set `REDIS_URL`, start Redis before the API** — otherwise the log fills with connection errors, cache/queue operations fail, and queued emails go nowhere.

Event data persists in the `mongo-data` Docker volume across restarts; `docker compose down -v` wipes it for a fresh start.

> **Port already taken?** If another Redis owns 6379, remap ours: `REDIS_PORT=6380 docker compose up -d` and set `REDIS_URL=redis://127.0.0.1:6380`.

**Using MongoDB Atlas instead of Docker** — set:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/virtual-events?retryWrites=true&w=majority
```

Two Atlas gotchas:
1. **Include the `/virtual-events` database name in the URI.** Without a path segment, Mongoose silently writes to a database literally named `test`.
2. **Add your IP under Atlas → Network Access**, or every connection attempt will hang and time out.

### 4. Start the apps

In two terminals (three if using the email worker):

```bash
npm run dev        # backend API on http://localhost:3000
npm run web:dev    # frontend on   http://localhost:3001
npm run worker     # optional: email worker (only with REDIS_URL set)
```

The backend prints a config summary at boot (MongoDB target, Redis on/off, email mode) — if behavior ever seems off, that summary is the first thing to check. `.env` is read once at startup, so restart the server after changing it. Note: once `REDIS_URL` is set, emails go through the queue, so the worker must be running for them to send.

### 5. Use it

Open **http://localhost:3001**, sign up (choose *Organize events* to get the organizer role), and create your first event. To try both roles, register a second account as an attendee in a private/incognito window.

Emails: without SMTP credentials the backend auto-provisions an [Ethereal](https://ethereal.email) test inbox — watch the backend (or worker) terminal for **preview URLs** of every welcome/confirmation email.

### Troubleshooting

The backend prints a **config summary at boot** (MongoDB target, Redis mode, email mode) — when anything below happens, check that summary first to see what the server is *actually* configured with.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Changed `.env` but behavior didn't change | `.env` is read **once at startup** | Restart the server (`npm run dev` does not watch `.env`) |
| Log spams `Redis error: connect ECONNREFUSED` | `REDIS_URL` is set but Redis isn't running | Start Redis first (`docker compose up -d`), or unset `REDIS_URL` to use in-process fallbacks |
| Emails never arrive while Redis is enabled | With `REDIS_URL` set, emails are queued — a worker must consume them | Run `npm run worker` in a separate terminal |
| No email seems to be "sent" at all | No SMTP configured — that's the Ethereal fallback | Look for the preview URL in the backend/worker logs, or set the `SMTP_*` variables for real delivery |
| `429 Too many requests` while testing signup/login | Auth endpoints are rate-limited to 10 requests/min/IP | Wait a minute, or raise `AUTH_RATE_LIMIT_MAX` in `.env` |
| Data lands in a database named `test` (Atlas) | `MONGODB_URI` has no database path segment | Append `/virtual-events` to the URI |
| Atlas connection hangs, then times out | Your IP isn't allowlisted | Atlas → Network Access → add your current IP |
| `Bind for 0.0.0.0:6379 failed: port is already allocated` | Another local Redis owns 6379 | `REDIS_PORT=6380 docker compose up -d` + `REDIS_URL=redis://127.0.0.1:6380` |
| Compose Mongo unhealthy after recreating containers | Stale replica-set state in the `mongo-data` volume | `docker compose down -v && docker compose up -d` (wipes local data) |
| Tests behave differently from the dev server | Intentional — tests **ignore `.env`** | Tests always run hermetically: in-memory MongoDB, Redis features off, rate limiting disabled, email mocked |

### All backend scripts

```bash
npm run dev            # backend with hot reload (restart manually after .env changes)
npm run test           # Jest suite (needs no MongoDB/Redis/Docker; ignores your .env)
npm run build          # compile TypeScript to dist/
npm start              # run the compiled server
npm run worker         # BullMQ email worker (requires REDIS_URL)
npm run worker:prod    # compiled email worker (after npm run build)
npm run typecheck      # type-check without emitting
npm run web:dev        # frontend dev server (proxies npm --prefix web)
npm run web:build      # frontend production build
npm run web:start      # frontend production server
```

### Environment variables (`.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/virtual-events` | MongoDB connection string |
| `JWT_SECRET` | dev-only fallback | Secret for signing JWTs — set a long random string |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | _unset_ | Optional real SMTP server. If unset, an Ethereal test account is created and preview URLs are logged |
| `EMAIL_FROM` | `Virtual Events <no-reply@virtual-events.local>` | From address |
| `REDIS_URL` | _unset_ | Enables the event read-cache, cross-instance rate limiting, and the durable BullMQ email queue. Unset = in-process fallbacks |
| `WEB_CONCURRENCY` | `1` | Number of clustered API processes (set to CPU count in production) |
| `AUTH_RATE_LIMIT_MAX` | `10` | Max `/register` + `/login` requests per IP per minute |
| `GLOBAL_RATE_LIMIT_MAX` | `1000` | Max requests per IP per minute across the API |
| `RATE_LIMIT_DISABLED` | _unset_ | Set to `1` to disable rate limiting (used by tests) |

## API

All `/events` routes require `Authorization: Bearer <token>`. Roles: `organizer` (can create/manage their own events) and `attendee` (default).

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/register` | public | Create an account (`name`, `email`, `password`, optional `role`). Sends a welcome email. Returns user + JWT |
| POST | `/login` | public | Log in (`email`, `password`). Returns user + JWT |
| GET | `/events` | authenticated | List events, paginated: `?page` (default 1) and `?limit` (default 20, max 100). Returns `{ events, page, limit, total }`. Cached for 30s when Redis is enabled |
| GET | `/events/:id` | authenticated | Event details with populated organizer and participants |
| POST | `/events` | organizer | Create an event (`title`, `description`, `date` `YYYY-MM-DD`, `time` `HH:MM`, optional `location`) |
| PUT | `/events/:id` | owning organizer | Update event fields (partial update) |
| DELETE | `/events/:id` | owning organizer | Delete the event and its registrations |
| POST | `/events/:id/register` | authenticated | Register the current user for the event (single atomic insert; duplicates rejected by a unique index). Returns `201 { message, registration }` and queues a confirmation email |
| DELETE | `/events/:id/register` | authenticated | Cancel the current user's registration. Returns `{ message }` |
| GET | `/events/my/registrations` | authenticated | List events the current user is registered for |
| GET | `/health` | public | Health check |

Error responses are JSON (`{ "error": "..." }`): `400` validation / malformed id, `401` missing or invalid token, `403` insufficient role or not the event's organizer, `404` not found, `409` duplicate email or duplicate event registration.

### Example flow

```bash
# 1. Register an organizer
curl -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Olivia","email":"olivia@example.com","password":"secret123","role":"organizer"}'

# 2. Create an event (use the returned token)
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Launch Party","description":"Product launch","date":"2026-09-01","time":"18:00","location":"Online"}'

# 3. Register another user for it
curl -X POST http://localhost:3000/events/<eventId>/register \
  -H "Authorization: Bearer $ATTENDEE_TOKEN"
```

## Testing

```bash
npm run test
```

32 tests across two suites (`tests/auth.test.ts`, `tests/events.test.ts`) cover registration, login, auth guards, role-based authorization, event CRUD, ownership checks, pagination, participant registration/cancellation, and a concurrency test proving that two simultaneous registrations for the same user/event produce exactly one success. Tests run against a real ephemeral MongoDB (`mongodb-memory-server`) with the email service mocked, no Redis required.

## Project structure

```
src/
  index.ts               # entry point: cluster mode (WEB_CONCURRENCY), Mongo connect, listen
  app.ts                 # Express app factory (imported by tests)
  config.ts              # environment configuration
  db.ts                  # Mongoose connection helpers
  redis.ts               # optional lazy Redis client (REDIS_URL)
  errors.ts              # HttpError class
  models/                # Mongoose schemas (User, Event, Registration)
  middleware/            # JWT auth, role guard, rate limiters, central error handler
  routes/                # /register, /login, /events endpoints
  services/              # email service (Nodemailer/Ethereal), Redis read-cache
  queues/                # BullMQ email queue (direct-send fallback without Redis)
  workers/               # email worker process (npm run worker)
tests/                   # Jest + Supertest integration tests
web/                     # Next.js 16 server-rendered frontend (see Frontend section)
```

## Frontend (`web/`)

Server-rendered React app on **Next.js 16** (App Router, React 19 Server Components, Tailwind CSS 4). The browser never talks to the Express API directly — Next acts as a backend-for-frontend: pages fetch data in server components and mutations run through Server Actions, both attaching the JWT server-side.

To run it, follow [Running locally](#running-locally) above — `npm run web:dev` serves it on http://localhost:3001.

### Pages

| Route | Backend endpoints used |
| --- | --- |
| `/login`, `/register` | `POST /login`, `POST /register` (sets the session cookie) |
| `/` | `GET /events` — paginated list via `?page=` |
| `/events/[id]` | `GET /events/:id`, `POST`/`DELETE /events/:id/register` |
| `/events/new` | `POST /events` (organizers only) |
| `/events/[id]/edit` | `PUT /events/:id`, `DELETE /events/:id` (owning organizer) |
| `/my-registrations` | `GET /events/my/registrations` |

### Frontend security

- **JWT in an httpOnly cookie** (`sameSite=lax`, `secure` in production) set by the Next server — client JavaScript can never read the token, so XSS cannot steal sessions. Never stored in localStorage or client state.
- **Server-only API access** — `BACKEND_URL` is a server env var (not `NEXT_PUBLIC_`), and `lib/api.ts` imports `server-only`, so bundling it into client code is a build error.
- **CSRF** — all mutations are Next Server Actions (built-in Origin/Host verification) and the `sameSite=lax` cookie blocks cross-site sends.
- **Security headers** ([next.config.ts](web/next.config.ts)) — CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, minimal `Permissions-Policy`.
- **XSS surface** — React auto-escaping only; no `dangerouslySetInnerHTML` anywhere; all user content rendered as text.
- **Validation both sides** — server actions validate inputs before proxying; the backend re-validates and re-authorizes every call (UI role checks are cosmetic, enforcement is backend).
- **Open-redirect safety** — the post-login `?next=` target is only honored for same-origin paths.
- **No error leakage** — backend errors are mapped to friendly messages; stacks and internals never reach the browser.

## Scalability notes

The design targets a read-heavy workload (event browsing dominates; writes are bursty around registration opens):

- **Stateless JWT API** — any number of instances behind a load balancer; `WEB_CONCURRENCY` clusters across cores on one machine.
- **Atomic registrations** — a separate `registrations` collection with a unique `{event, user}` index makes duplicate registration impossible under concurrency (no read-modify-write on the event document, no unbounded embedded arrays).
- **Cache-friendly reads** — paginated, `lean()` event listings backed by a `{date, time}` index, cached in Redis with a 30s TTL and invalidated on writes.
- **Durable async email** — registration responses never wait on SMTP; jobs go to a BullMQ queue and a separate worker retries with exponential backoff.
- **Abuse protection** — strict per-IP rate limits on the bcrypt-heavy auth endpoints (Redis-backed so limits hold across instances), lax global safety net.
