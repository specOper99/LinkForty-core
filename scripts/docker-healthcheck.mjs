#!/usr/bin/env node
/**
 * Coolify / Docker health probe for LinkForty Core.
 * Prefer this over inline `node -e` / wget (alpine has no wget by default).
 * Exit 0 only when the server is listening and returns 200.
 */
const url = process.env.HEALTHCHECK_URL || 'http://127.0.0.1:3000/api/sdk/v1/health';

const ac = new AbortController();
const t = setTimeout(() => ac.abort(), 4000);

try {
  const res = await fetch(url, { signal: ac.signal });
  clearTimeout(t);
  process.exit(res.ok ? 0 : 1);
} catch {
  clearTimeout(t);
  process.exit(1);
}
