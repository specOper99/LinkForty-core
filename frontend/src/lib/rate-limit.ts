type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window in-memory rate limiter (single-instance).
 * Suitable for single-operator dashboard; replace with Redis for multi-replica.
 */
export function rateLimit(
  key: string,
  {
    limit = 5,
    windowMs = 15 * 60 * 1000,
  }: { limit?: number; windowMs?: number } = {},
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSec: 0,
  };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
