# Multi-stage build for production
#
# Coolify injects ARG for every env var (JWT_SECRET, DATABASE_URL, …). This
# Dockerfile never references those ARGs — do not ENV them into the image.
# Runtime secrets come only from compose `environment:` / Coolify runtime env.
# NODE_ENV at build can be production; pin development on the npm ci RUN below.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build).
# Coolify may inject NODE_ENV=production as a build-arg/ENV — pin development
# on this RUN so TypeScript/devDeps still install. prepare is skipped via --ignore-scripts.
RUN NODE_ENV=development npm ci --ignore-scripts

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

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

# Install production dependencies only (ignore Coolify-injected NODE_ENV)
RUN NODE_ENV=production npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy example server + health probe (no wget required)
COPY examples/basic-server.ts ./
COPY scripts/docker-healthcheck.mjs ./docker-healthcheck.mjs

# Install tsx globally for running TypeScript
RUN npm install -g tsx

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
CMD ["sh", "-c", "tsx dist/scripts/migrate.js && exec tsx basic-server.ts"]
