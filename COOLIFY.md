# Coolify: Core + Dashboard (one resource)

Deploy Postgres, Redis, LinkForty Core, and the operator dashboard as a **single** Coolify Docker Compose resource. All four share the project network (`CORE_URL=http://linkforty:3000`).

```text
Browser ──► Traefik ──► linkforty :3000   (shortlinks / API)
         └──────────► dashboard :3001  (operator UI)
dashboard ──CORE_URL──► http://linkforty:3000  (Docker DNS)
linkforty ────────────► postgres, redis
```

## Setup

1. **New resource** → Docker Compose (Git).
2. **Compose file** = `docker-compose.coolify.yml`.
3. **Environment** — paste from [`.env.coolify.example`](.env.coolify.example). Required:
   - `JWT_SECRET`, `AUTH_SECRET`, `ADMIN_USERNAME`, `OPERATOR_USER_ID`
   - `ADMIN_PASSWORD_HASH` (bcrypt; escape `$` as `$$`)
   - `CORS_ORIGIN` = public dashboard origin
   - `AUTH_URL` = public dashboard URL (**no** `:3001`)
   - `SHORTLINK_BASE_URL` = public shortlink origin
   - `POSTGRES_PASSWORD` = **alphanumeric only** (Compose builds `DATABASE_URL`)
4. **Domains** (FQDN **plus** container port):

   | Service | Example | Purpose |
   |---|---|---|
   | `linkforty` | `https://links.example.com:3000` | Redirects, public API |
   | `dashboard` | `https://dashboard.example.com:3001` | Operator UI |

5. Match env to those hosts:

   ```text
   AUTH_URL=https://dashboard.example.com
   SHORTLINK_BASE_URL=https://links.example.com
   CORS_ORIGIN=https://dashboard.example.com
   CORE_URL=http://linkforty:3000
   ```

6. Deploy. Redeploy after Domains changes.

`linkforty` and `dashboard` join the external `coolify` network and set `traefik.docker.network=coolify`. Do **not** set Traefik `loadbalancer.server.port` in compose — Coolify Domains owns the port.

Leave `DATABASE_URL` unset in the Coolify UI (compose sets it). Do not publish Postgres/Redis host ports.

## bcrypt `$` escaping

Compose treats `$name` as interpolation. In Coolify → Environment Variables, escape every `$` as `$$`:

```text
ADMIN_PASSWORD_HASH=$$2b$$12$$zU2dGbpZ0j…
```

```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
# then replace every $ with $$ before pasting
```

## Local verify (optional)

```bash
cp .env.coolify.example .env
# edit secrets (alphanumeric POSTGRES_PASSWORD)
docker network create coolify 2>/dev/null || true
docker compose -f docker-compose.coolify.yml config
docker compose -f docker-compose.coolify.yml up --build
```

## Other compose files

| File | Use |
|---|---|
| [`docker-compose.yml`](docker-compose.yml) | Core-only via published image |
| [`docker-compose.yaml`](docker-compose.yaml) | Core-only build-from-source |
| [`frontend/docker-compose.yml`](frontend/docker-compose.yml) | UI-only against an external Core |

For Coolify production, use **only** `docker-compose.coolify.yml`.
