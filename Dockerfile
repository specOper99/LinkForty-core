# Multi-stage build for production
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

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S linkforty && \
    adduser -S linkforty -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy example server file
COPY examples/basic-server.ts ./

# Install tsx globally for running TypeScript
RUN npm install -g tsx

# Change ownership to non-root user
RUN chown -R linkforty:linkforty /app

# Switch to non-root user
USER linkforty

# Expose port
EXPOSE 3000

# Health check — /api/sdk/v1/health (not /health). start-period covers migrate+boot.
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/sdk/v1/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start server
CMD ["sh", "-c", "tsx dist/scripts/migrate.js && tsx basic-server.ts"]
