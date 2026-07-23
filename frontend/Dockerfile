# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholders only. Coolify injects ARG/build-args for all env vars —
# never let real secrets (esp. bcrypt `$2b$…`) into this stage; `$` breaks Docker/Compose.
ENV NEXT_TELEMETRY_DISABLED=1

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

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/src ./src

USER nextjs
EXPOSE 3001
CMD ["node", "server.mjs"]
