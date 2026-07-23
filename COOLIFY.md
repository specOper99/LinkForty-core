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
   - `ADMIN_PASSWORD_HASH_B64` (base64 bcrypt — see below)
   - `CORS_ORIGIN` = public dashboard origin
   - `AUTH_URL` = public dashboard URL (**no** `:3001`)
   - `SHORTLINK_BASE_URL` = public shortlink origin
   - `POSTGRES_PASSWORD` = **alphanumeric only** (Compose builds `DATABASE_URL`)
4. **Runtime only** — in Coolify → Environment Variables, uncheck **Available at Buildtime** for:
   - `NODE_ENV`, `JWT_SECRET`, `AUTH_SECRET`, `ADMIN_PASSWORD_HASH_B64`, `ADMIN_PASSWORD_HASH`, `POSTGRES_PASSWORD`
   - Coolify otherwise injects them as Docker `ARG` / `--build-arg` and breaks the build (`tsc` missing, bcrypt `$` warnings).
5. **Domains** (FQDN **plus** container port):

   | Service | Example | Purpose |
   |---|---|---|
   | `linkforty` | `https://links.example.com:3000` | Redirects, public API |
   | `dashboard` | `https://dashboard.example.com:3001` | Operator UI |

6. Match env to those hosts:

   ```text
   AUTH_URL=https://dashboard.example.com
   SHORTLINK_BASE_URL=https://links.example.com
   CORS_ORIGIN=https://dashboard.example.com
   CORE_URL=http://linkforty:3000
   ```

7. Deploy. Redeploy after Domains changes.

`linkforty` and `dashboard` join the external `coolify` network and set `traefik.docker.network=coolify`. Do **not** set Traefik `loadbalancer.server.port` in compose — Coolify Domains owns the port.

Leave `DATABASE_URL` unset in the Coolify UI (compose sets it). Do not publish Postgres/Redis host ports.

## Admin password (use base64 — do not paste raw bcrypt)

Raw bcrypt (`$2b$12$…`) breaks Compose/Coolify: `$` is variable interpolation (`The "zU2dGbpZ0j" variable is not set`). `$$` escaping often still fails because Coolify also passes the value as a build-arg.

**Use `ADMIN_PASSWORD_HASH_B64` instead** (no `$` characters):

```bash
# 1) hash
node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"

# 2) base64-encode the hash string (example):
node -e "console.log(Buffer.from(process.argv[1]).toString('base64'))" '$2b$12$zU2dGbpZ0j/knf5q8fiUCeXAdiCY1yCRn6/EODqgF5BLZFJY40o66'
# → JDJiJDEyJHpVMmRHYnBaMGova25mNXE4ZmlVQ2VYQWRpQ1kxeUNSbjYvRU9EcWdGNUJMWkZKWTQwbzY2
```

In Coolify env (runtime only):

```text
ADMIN_PASSWORD_HASH_B64=JDJiJDEyJHpVMmRHYnBaMGova25mNXE4ZmlVQ2VYQWRpQ1kxeUNSbjYvRU9EcWdGNUJMWkZKWTQwbzY2
```

Leave `ADMIN_PASSWORD_HASH` empty on Coolify.

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
