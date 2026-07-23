# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./

# --include=dev: hosts may inject ARG NODE_ENV=production and skip build tools.
RUN npm ci --include=dev

COPY . .

# Build-time placeholders only — never bake real secrets into the image.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN CORE_URL=http://127.0.0.1:3000 \
    AUTH_SECRET=build-time-placeholder-not-used \
    AUTH_URL=http://localhost:3001 \
    ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=build-placeholder \
    ADMIN_PASSWORD_HASH= \
    ADMIN_PASSWORD_HASH_B64= \
    OPERATOR_USER_ID=00000000-0000-4000-8000-000000000001 \
    npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOST=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

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
