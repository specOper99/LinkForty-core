/**
 * Path allowlist for BFF → Core proxy.
 * Never open-proxy; strip anything outside management surface.
 */
const ALLOWED_PATTERNS: RegExp[] = [
  /^health$/,
  /^api\/links$/,
  /^api\/links\/[^/]+$/,
  /^api\/links\/[^/]+\/duplicate$/,
  /^api\/links\/[^/]+\/qr$/,
  /^api\/analytics\/overview$/,
  /^api\/analytics\/links\/[^/]+$/,
  /^api\/webhooks$/,
  /^api\/webhooks\/[^/]+$/,
  /^api\/webhooks\/[^/]+\/test$/,
  /^api\/debug\/simulate$/,
  /^api\/debug\/user-agents$/,
  /^api\/debug\/countries$/,
  /^api\/debug\/languages$/,
  /^api\/sdk\/v1\/health$/,
  /^api\/sdk\/v1\/attribution\/[^/]+$/,
  /^\.well-known\/apple-app-site-association$/,
  /^\.well-known\/assetlinks\.json$/,
];

export function normalizeCorePath(pathSegments: string[]): string {
  return pathSegments
    .map((s) => decodeURIComponent(s))
    .join("/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function isAllowedCorePath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return ALLOWED_PATTERNS.some((re) => re.test(normalized));
}

/** Paths that accept/require operator userId scoping */
export function pathUsesUserId(path: string): boolean {
  return (
    path.startsWith("api/links") ||
    path.startsWith("api/analytics") ||
    path.startsWith("api/webhooks") ||
    path === "api/debug/simulate" ||
    path.startsWith("api/debug/live")
  );
}
