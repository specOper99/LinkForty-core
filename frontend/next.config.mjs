/** @type {import('next').NextConfig} */
function serverActionOrigins() {
  const origins = new Set();
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) {
    try {
      origins.add(new URL(authUrl).host);
    } catch {
      /* ignore bad AUTH_URL at build */
    }
  }
  const extra = process.env.SERVER_ACTIONS_ORIGINS?.trim();
  if (extra) {
    for (const part of extra.split(",")) {
      const host = part.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (host) origins.add(host);
    }
  }
  return [...origins];
}

const allowedOrigins = serverActionOrigins();

const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Prevent CSRF false-positives behind Coolify / Cloudflare when Host differs.
    ...(allowedOrigins.length > 0
      ? { serverActions: { allowedOrigins } }
      : {}),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
