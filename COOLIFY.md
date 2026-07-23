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
   - `POSTGRES_PASSWORD` (prefer alphanumeric; special chars OK with discrete PG vars)
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

`linkforty` and `dashboard` join the external proxy network (`coolify` by default; override with `COOLIFY_NETWORK` if needed) and set `traefik.docker.network=coolify`. Do **not** set Traefik `loadbalancer.server.port` in compose — Coolify Domains owns the port.

If deploy fails with `network … declared as external, but could not be found`:

```bash
# Traefik network (normal Coolify host):
docker network create coolify 2>/dev/null || true
```

If the missing name is your **resource UUID** (e.g. `z1auwi48iaqhcabon68pedhm`): Coolify env had `COOLIFY_NETWORK` overridden. Compose now hardcodes `name: coolify` — delete any `COOLIFY_NETWORK` variable from the Coolify UI, pull latest compose, redeploy. Do **not** create a UUID-named stand-in unless Coolify UI Destination Network is intentionally that UUID.

**Leave `DATABASE_URL` unset** in the Coolify UI — compose passes `PGHOST` + `POSTGRES_*` (avoids URL-mangled passwords). Do not publish Postgres/Redis host ports.

**Postgres volume:** `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` only apply on **first** init. Changing them later without a new volume → `28P01` forever. Compose uses volume `postgres_data_v2` (bumped so Coolify creates a fresh disk). After future password changes: wipe that volume or bump the name again in compose.

Postgres log must show full init (`CREATE DATABASE`, not `Skipping initialization`) on the deploy that matches your current password.

If the Coolify resource has a custom **Healthcheck** (curl/wget to `/`), disable it and rely on compose — or set path `/api/sdk/v1/health`, start period ≥90s, retries ≥5.

## `dependency failed… unhealthy` in ~1s

Compose messages differ:

| Message | Meaning |
|---|---|
| `container … is unhealthy` | Process may still be running; Docker health = unhealthy |
| `container … exited (N)` | Process crash (migrate/server exit) |

Coolify often ignores compose `start_period` or overrides the healthcheck in the UI, so Core looks unhealthy before migrate finishes. Dashboard uses `depends_on: service_started` so that race does not block deploy.

Still check Core logs on the host:

```bash
docker ps -a --filter name=linkforty --format '{{.ID}} {{.Names}} {{.Status}}'
CID=$(docker ps -aq --filter name=linkforty | head -1)
docker logs --tail 200 "$CID"
docker inspect --format '{{json .State.Health}}' "$CID" | jq .
```

Common log signals:

| Signal | Fix |
|---|---|
| `28P01` / password auth failed | **Same password must reach both containers**, then wipe volume. See below. |
| `database "…username…" does not exist` | Old healthcheck without `-d` (noise) or mangled `DATABASE_URL` — clear UI `DATABASE_URL` |
| `does not support SSL` | Compose sets `DATABASE_SSL=false` — clear any UI `DATABASE_URL` that forces SSL |
| `Skipping initialization` | Volume already has data — env user/password changes ignored until volume wipe |
| Core log `passwordLen=8` | Linkforty got default `changeme` — Coolify did not pass `POSTGRES_PASSWORD` into compose env |
| Core log `passwordLen=N` but still 28P01 | Length ≠ postgres; compare with commands below; wipe volume after fixing |

### Network mismatch (28P01 with correct password)

If `docker inspect` shows **linkforty** on `coolify` + `…_default` but **postgres** only on a bare UUID network, Core’s `postgres` DNS hits the wrong place.

**Immediate fix on host** (use your resource UUID):

```bash
P=$(docker ps -q --filter name=postgres | head -1)
L=$(docker ps -q --filter name=linkforty | head -1)
# connect postgres onto every network linkforty already uses:
for n in $(docker inspect "$L" --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}'); do
  docker network connect "$n" "$P" 2>/dev/null || true
done
docker exec -i "$P" psql -U mediazan -d postgres -c "ALTER USER mediazan WITH PASSWORD 'TheP1AssD1c7Here';"
docker restart "$L"
```

Compose now attaches postgres/redis to both `default` and `coolify` with aliases so this should not recur after redeploy.

Use `inspect` (works even when linkforty is restarting — `docker exec` lies):

```bash
P=$(docker ps -aq --filter name=postgres | head -1)
L=$(docker ps -aq --filter name=linkforty | head -1)
docker inspect "$P" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^POSTGRES_PASSWORD=' | sha256sum
docker inspect "$L" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^POSTGRES_PASSWORD=' | sha256sum
# Also check Core log for passwordLen=N
docker logs --tail 30 "$L"
```

Hashes must match. If linkforty line missing → `POSTGRES_PASSWORD` never reached Core (compose/Coolify bug).

Reset recipe that always works:

1. Coolify env (runtime only): `POSTGRES_DB=linkforty`, `POSTGRES_USER=linkforty`, `POSTGRES_PASSWORD=linkforty` (simple alphanumeric).
2. Delete any `DATABASE_URL` in Coolify UI.
3. Wipe postgres volume.
4. Redeploy. Core log should show `passwordLen=10` and connect.
| `Server listening` + Health unhealthy | Probe/UI override — disable Coolify custom healthcheck |
| Instant exit, no listen | Inspect exit code; missing `JWT_SECRET` / migrate error |

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
