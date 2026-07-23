# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./

# Runtime deps + build toolchain only in this stage.
# No --include=dev / no NODE_ENV=development — Coolify-safe under production.
RUN npm ci --omit=dev \
 && npm install --no-save \
      typescript@5.9.3 \
      tailwindcss@4.3.3 \
      @tailwindcss/postcss@4.3.3 \
      @types/node@20.19.43 \
      @types/react@19.2.17 \
      @types/react-dom@19.2.3 \
      @types/bcryptjs@2.4.6 \
      @types/ws@8.18.1

COPY . .

# Build-time placeholders only. Coolify injects ARG/build-args for all env vars —
# never let real secrets (esp. bcrypt `$2b$…`) into this stage; `$` breaks Docker/Compose.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN CORE_URL=http://127.0.0.1:3000 \
    AUTH_SECRET=build-time-placeholder-not-used \
    AUTH_URL=http://localhost:3001 \
    ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=build-placeholder \
    ADMIN_PASSWORD_HASH= \
    OPERATOR_USER_ID=00000000-0000-4000-8000-000000000001 \
    npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOST=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Runtime deps only — next.config.mjs needs no TypeScript.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.mjs ./server.mjs

RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3001
CMD ["node", "server.mjs"]
