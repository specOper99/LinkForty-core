# Coolify: Core + Dashboard (one resource)

Deploy Postgres, Redis, LinkForty Core, and the operator dashboard from this monorepo as a **single** Coolify Docker Compose resource. All four services share the project network, so `CORE_URL=http://linkforty:3000` works without a shared external network.

```text
Browser ──► Traefik ──► linkforty :3000   (shortlinks / API)
         └──────────► dashboard :3001  (operator UI)
dashboard ──CORE_URL──► http://linkforty:3000  (Docker DNS)
linkforty ────────────► postgres, redis
```

## Coolify UI setup

1. **New resource** → Docker Compose (Git).
2. **Compose file** = `docker-compose.coolify.yml` (repo root).
3. **Environment** — paste from [`.env.coolify.example`](.env.coolify.example). Required:
   - `JWT_SECRET`, `AUTH_SECRET`, `ADMIN_USERNAME`, `OPERATOR_USER_ID`
   - `ADMIN_PASSWORD_HASH` (bcrypt) for production
   - `CORS_ORIGIN` = public dashboard origin
   - `AUTH_URL` = public dashboard URL (**no** `:3001`)
   - `SHORTLINK_BASE_URL` = public shortlink origin
4. **Domains** (per service — FQDN **plus** container port):

   | Service | Coolify Domains example | Purpose |
   |---|---|---|
   | `linkforty` | `https://links.example.com:3000` | Redirects, public API, well-known |
   | `dashboard` | `https://dashboard.example.com:3001` | Operator UI |

5. Set env to match those hosts:

   ```text
   AUTH_URL=https://dashboard.example.com
   SHORTLINK_BASE_URL=https://links.example.com
   CORS_ORIGIN=https://dashboard.example.com
   CORE_URL=http://linkforty:3000
   ```

6. Deploy once. Redeploy after any Domains change.

`linkforty` and `dashboard` also join the external `coolify` network (Traefik) and set `traefik.docker.network=coolify`. Do **not** set Traefik `loadbalancer.server.port` in compose — Coolify Domains owns the port.

## bcrypt `$` escaping (required)

`ADMIN_PASSWORD_HASH` looks like `$2b$12$zU2dGbpZ0j…`. Docker Compose treats `$name` as interpolation, so unescaped hashes produce warnings like `The "zU2dGbpZ0j" variable is not set` and a broken login hash.

**In Coolify → Environment Variables**, escape every `$` as `$$` (paste the escaped form, not the raw bcrypt string):

```text
# Wrong (Compose eats $ chunks):
ADMIN_PASSWORD_HASH=$2b$12$zU2dGbpZ0j…

# Right (each $ → $$):
ADMIN_PASSWORD_HASH=$$2b$$12$$zU2dGbpZ0j…
```

Generate hash, then escape:

```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
# then replace every $ with $$ before pasting into Coolify
```

Compose passes `ADMIN_PASSWORD_HASH` through to the dashboard container; one Compose interpolation pass turns `$$` back into `$` for Node/bcrypt.
## What not to do

| Anti-pattern | Why it breaks |
|---|---|
| Two Coolify Compose stacks + manual `linkforty_shared` | Unstable DNS (`linkforty` vs `linkforty-<uuid>`), Traefik wrong network → 502 / BFF `fetch failed` |
| `CORE_URL=https://links.example.com` (Cloudflare public) | Bot Fight / WAF blocks server-side BFF; use Docker DNS |
| `CORE_URL=http://127.0.0.1:3000` inside a container | That is **this** container, not Core |
| `AUTH_URL` with `:3001` or set to the shortlink host | Auth.js / Server Actions host mismatch |
| Publishing Postgres/Redis host ports on Coolify | Unnecessary attack surface |
| Empty `JWT_SECRET` when compose references it | Bad expand / deploy noise |
| `CORS_ORIGIN=*` with a public dashboard | Prefer the dashboard origin only |

## Local verify (optional)

```bash
# Validate compose (needs required env; coolify net must exist for `up`)
cp .env.coolify.example .env
# edit secrets, then:
docker network create coolify 2>/dev/null || true
docker compose -f docker-compose.coolify.yml config
docker compose -f docker-compose.coolify.yml up --build
# from dashboard container:
#   fetch http://linkforty:3000/api/sdk/v1/health
```

## Other compose files (keep for non-Coolify)

| File | Use |
|---|---|
| [`docker-compose.yml`](docker-compose.yml) | Core-only via published `linkforty/core` image |
| [`docker-compose.yaml`](docker-compose.yaml) | Core-only build-from-source + shared-net experiments |
| [`frontend/docker-compose.yml`](frontend/docker-compose.yml) | UI-only against an **external** Core (local/dev) |

For Coolify production, prefer **only** `docker-compose.coolify.yml`.
