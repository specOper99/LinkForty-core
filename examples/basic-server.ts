import { createServer } from '@linkforty/core';

function getTrustProxy(): boolean | number | undefined {
  const v = process.env.TRUST_PROXY;
  if (v === undefined || v === '') return undefined;
  if (v === '1' || v.toLowerCase() === 'true') return true;
  const n = Number(v);
  if (!Number.isNaN(n) && n >= 0) return n;
  return undefined;
}

async function start() {
  // Prefer DATABASE_URL when set. Otherwise leave url unset so createServer
  // uses discrete PGHOST + POSTGRES_* / PG* (Coolify compose path).
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const server = await createServer({
    database: databaseUrl
      ? { url: databaseUrl }
      : {},
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
    trustProxy: getTrustProxy(),
  });

  await server.listen({
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
  });

  console.log('LinkForty server running on http://localhost:3000');
  console.log('');
  console.log('API Endpoints:');
  console.log('  POST   /api/links          - Create a new link');
  console.log('  GET    /api/links          - List all links (requires ?userId=xxx)');
  console.log('  GET    /api/links/:id      - Get a specific link (requires ?userId=xxx)');
  console.log('  PUT    /api/links/:id      - Update a link (requires ?userId=xxx)');
  console.log('  DELETE /api/links/:id      - Delete a link (requires ?userId=xxx)');
  console.log('  GET    /api/analytics/overview - Get analytics overview (requires ?userId=xxx)');
  console.log('  GET    /api/analytics/links/:linkId - Get link analytics (requires ?userId=xxx)');
  console.log('');
  console.log('Public Endpoint:');
  console.log('  GET    /:shortCode         - Redirect to target URL');
}

start().catch((err) => {
  console.error('LinkForty server failed to start:', err);
  process.exit(1);
});
