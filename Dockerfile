# Multi-stage build for production
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
# Override a build-time NODE_ENV=production so TypeScript is installed.
# The explicit build command below replaces the prepare lifecycle hook.
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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start server
CMD ["sh", "-c", "tsx dist/scripts/migrate.js && tsx basic-server.ts"]
