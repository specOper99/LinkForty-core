# LinkForty Core Dashboard

Self-hosted **UI-only** operator console for [LinkForty Core](https://github.com/LinkForty/core). Browser talks to this Next.js BFF; BFF talks to your existing Core via `CORE_URL`. Core port/secrets never leave the server for API calls.

## Stack

- Next.js 15 App Router + TypeScript + Tailwind CSS v4
- Auth.js (Credentials) — single-operator encrypted session cookie
- Zod-typed Core HTTP client + allowlisted `/api/core/*` proxy
- Custom `server.mjs` — authenticated WebSocket proxy for `/api/debug/live`
- Recharts analytics, Playwright E2E (journey + a11y + security) vs mocked Core

## Quick start

```bash
cp .env.example .env
# edit CORE_URL, AUTH_SECRET, ADMIN_*, OPERATOR_USER_ID
# optional: SHORTLINK_BASE_URL for public shortlink domain

npm install
npm run dev
# → http://localhost:3001 (includes WS live proxy)
```

`npm run dev:next` runs Turbopack without the WS proxy (HTTP features only).

### Coolify (Core + Dashboard)

Use the **root** single-resource stack — see [`../COOLIFY.md`](../COOLIFY.md):

- Compose: [`../docker-compose.coolify.yml`](../docker-compose.coolify.yml)
- Env: [`../.env.coolify.example`](../.env.coolify.example)

```text
AUTH_URL=https://dashboard.example.com          # no :3001
SHORTLINK_BASE_URL=https://links.example.com
CORE_URL=http://linkforty:3000                  # Docker DNS
CORS_ORIGIN=https://dashboard.example.com       # on Core
```

### Docker (UI image only — local / external Core)

Use this directory’s compose when Core already runs elsewhere:

```bash
cp .env.example .env
# create once if Core is on a separate compose:
docker network create linkforty_shared
# set CORE_URL=http://linkforty:3000 (same Docker network as Core)
# set AUTH_URL=https://your-dashboard.example.com
docker compose up --build
```

Probe Core from the dashboard container with `GET /api/sdk/v1/health` (not `/health` — that hits the redirect catch-all).

## Required env

| Variable | Purpose |
|---|---|
| `CORE_URL` | **Internal** Core origin (no `/api`). Same Docker network: `http://linkforty:3000`. Do **not** use Cloudflare public host or `127.0.0.1` inside a container |
| `SHORTLINK_BASE_URL` | Public shortlink domain for UI (e.g. `https://links.example.com`) while `CORE_URL` stays private |
| `CORE_API_TOKEN` | Optional `Authorization: Bearer …` if a gateway wraps Core |
| `AUTH_SECRET` | Auth.js cookie encryption (`openssl rand -base64 32`) |
| `ADMIN_USERNAME` | Operator login name |
| `ADMIN_PASSWORD_HASH` | bcrypt hash (required in production) |
| `ADMIN_PASSWORD` | Plain password — local only if hash unset |
| `OPERATOR_USER_ID` | Real UUID for Core `user_id` (`uuidgen`). Empty / `"admin"` / `"user-1"` → login fails |

Optional: `AUTH_URL` (public dashboard URL), `PORT` (default `3001`), `COMPOSE_SHARED_NETWORK` (default `linkforty_shared`).

Generate a password hash:

```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
```

**Compose / Coolify + bcrypt:** do **not** paste raw `$2b$12$…`. Use base64 — see [`COOLIFY.md`](../COOLIFY.md):

```text
ADMIN_PASSWORD_HASH_B64=JDJiJDEyJHpVMmRHYnBaMGova25mNXE4ZmlVQ2VYQWRpQ1kxeUNSbjYvRU9EcWdGNUJMWkZKWTQwbzY2
```

## Routes

| Path | Purpose |
|---|---|
| `/login` | Operator credentials |
| `/` | Analytics overview |
| `/links` | List / create / edit / QR / per-link analytics |
| `/webhooks` | CRUD, secret reveal-once, test delivery |
| `/debug` | Simulate / live WS / attribution. Core `createServer()` registers `debugRoutes`; UA/country/language presets still fall back locally on 404 |
| `/settings` | Health probes, well-known verify, CORS checklist |

## Architecture

- Session: HttpOnly + Secure (prod) + SameSite=Lax JWT cookie
- `/api/core/[...path]` — authenticated HTTP proxy; path allowlist; strips client `userId`, injects `OPERATOR_USER_ID`
- `/api/debug/live` — WebSocket proxy (via `server.mjs`) to Core live events
- `src/lib/core` — typed client + Zod schemas
- Response headers: `X-Frame-Options: DENY`, `nosniff`, strict referrer, locked Permissions-Policy

Browser must not call Core for management APIs. Use Server Components / Actions / `/api/core/*` / dashboard WS. Shortlink clicks may hit the public redirect host (`SHORTLINK_BASE_URL`).

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server + WS proxy (`server.mjs`) |
| `npm run build` | Production build |
| `npm run start` | Production server + WS proxy |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright vs mocked Core (journey + a11y + security) |
| `npm test` | typecheck + e2e |

## Production checklist

1. Set Core `CORS_ORIGIN` to this dashboard origin **only** (no `*`).
2. Keep Core private for management; expose only the dashboard BFF. Prefer root `docker-compose.coolify.yml` for Coolify.
3. Set `SHORTLINK_BASE_URL` to the public shortlink domain so the UI never prints a private `CORE_URL`.
4. Use `ADMIN_PASSWORD_HASH` (bcrypt) — never plain `ADMIN_PASSWORD` in production.
5. Set `AUTH_URL` to the public **dashboard** URL (separate host from shortlinks); keep `AUTH_SECRET` long.
6. Point shortlink / AASA / assetlinks domains at Core; verify `/api/sdk/v1/health` (not `/health`) on `/settings`.
7. Run with `node server.mjs` (or Docker image CMD) so live WS proxy works.
8. Confirm browser never calls Core for `/api/*` management (Playwright security suite).
9. On Coolify: follow [`COOLIFY.md`](../COOLIFY.md); alphanumeric `POSTGRES_PASSWORD`; do not publish Postgres/Redis ports.

## Troubleshooting: `unexpected response` / 403 on `/links/new`

Next.js soft navigations and Server Actions are **POSTs** with special headers (`RSC`, `Next-Action`). Cloudflare Bot Fight / WAF often returns **403 HTML**, and the browser shows:

> Application error: … unexpected response was received from the server (Status: 403)

**Do this:**

1. Host dashboard on its **own** hostname — e.g. `https://dashboard.964media.com` — **not** on `https://links.964media.com` (that host should stay Core redirects).
2. Set env:
   ```bash
   AUTH_URL=https://dashboard.964media.com
   SHORTLINK_BASE_URL=https://links.964media.com
   CORE_URL=http://linkforty:3000   # private
   AUTH_TRUST_HOST=true
   ```
3. Cloudflare → Security → Bots: disable **Bot Fight Mode** for the dashboard hostname, **or** WAF custom rule **Skip** when:
   - Hostname = dashboard host, and
   - URI Path starts with `/_next`, **or**
   - Request Header `next-action` exists, **or**
   - Request Header `rsc` exists
4. Redeploy dashboard after env change; hard-refresh (clear cookies if you changed host).
