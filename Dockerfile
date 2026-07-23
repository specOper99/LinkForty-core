# Multi-stage build for production
#
# Do not ENV build-args (JWT_SECRET, DATABASE_URL, …) into the image.
# Runtime secrets come only from compose `environment:` / host runtime env.
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# --include=dev: hosts (e.g. Coolify) may inject ARG NODE_ENV=production,
# which would otherwise make npm ci skip typescript / @types.
RUN npm ci --include=dev --ignore-scripts

COPY . .

RUN ./node_modules/.bin/tsc

# Production stage
FROM node:22-alpine

# dumb-init: signal handling. curl: optional for hosts that probe with curl/wget.
RUN apk add --no-cache dumb-init curl

RUN addgroup -g 1001 -S linkforty && \
    adduser -S linkforty -u 1001

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

COPY examples/basic-server.mjs ./
COPY scripts/docker-healthcheck.mjs ./docker-healthcheck.mjs

RUN chown -R linkforty:linkforty /app

USER linkforty

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 \
  CMD node /app/docker-healthcheck.mjs

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "node dist/scripts/migrate.js && exec node basic-server.mjs"]
