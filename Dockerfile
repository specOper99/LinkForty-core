# Multi-stage build for production
#
# Coolify injects ARG for every env var (JWT_SECRET, DATABASE_URL, …). This
# Dockerfile never references those ARGs — do not ENV them into the image.
# Runtime secrets come only from compose `environment:` / Coolify runtime env.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Prod deps + compiler only in this stage (library keeps typescript in
# package.json devDependencies so npm publish stays clean).
RUN npm ci --omit=dev --ignore-scripts \
 && npm install --no-save --ignore-scripts \
      typescript@5.9.3 \
      @types/node@20.19.24 \
      @types/pg@8.15.6 \
      @types/geoip-lite@1.4.4 \
      @types/qrcode@1.5.6 \
      @types/ua-parser-js@0.7.39

# Copy source files
COPY . .

# Build TypeScript → dist/
RUN npx tsc

# Production stage
FROM node:22-alpine

# dumb-init: signal handling. curl: Coolify UI / some hosts still probe with curl/wget.
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S linkforty && \
    adduser -S linkforty -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Production dependencies only — no typescript, no tsx
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Plain JS entry (no tsx / no runtime TypeScript)
COPY examples/basic-server.mjs ./
COPY scripts/docker-healthcheck.mjs ./docker-healthcheck.mjs

# Change ownership to non-root user
RUN chown -R linkforty:linkforty /app

# Switch to non-root user
USER linkforty

# Expose port
EXPOSE 3000

# Image HEALTHCHECK — Coolify may parse/honor this. start-period MUST stay high:
# migrate+listen often 10–60s. Probe uses node fetch (no wget).
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 \
  CMD node /app/docker-healthcheck.mjs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Migrate then serve. Non-zero migrate exit → container exits (Compose: "exited").
# "is unhealthy" in <1s with start_period set usually means HC override / no start_period.
CMD ["sh", "-c", "node dist/scripts/migrate.js && exec node basic-server.mjs"]
