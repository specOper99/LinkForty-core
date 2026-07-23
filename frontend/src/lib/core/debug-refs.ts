/**
 * Built-in debug reference lists.
 *
 * Vanilla `@linkforty/core` `createServer()` does NOT register `debugRoutes`
 * (simulate / user-agents / countries / languages / live WS). Those return 404
 * unless the Core host explicitly `register(debugRoutes)`. Dashboard falls
 * back to these fixtures so Debug UI still works.
 */

export type DebugUserAgent = {
  name: string;
  deviceType: string;
  userAgent: string;
};

export type DebugCountry = { code: string; name: string };
export type DebugLanguage = { code: string; name: string };

const UA = {
  ios: [
    {
      name: "iPhone 15 Pro - iOS 17 - Safari",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      device: "ios",
    },
    {
      name: "iPhone 14 - iOS 16 - Safari",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      device: "ios",
    },
    {
      name: "iPad Pro - iOS 17 - Safari",
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      device: "ios",
    },
  ],
  android: [
    {
      name: "Samsung Galaxy S23 - Android 13 - Chrome",
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
      device: "android",
    },
    {
      name: "Google Pixel 8 - Android 14 - Chrome",
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
      device: "android",
    },
    {
      name: "OnePlus 11 - Android 13 - Chrome",
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
      device: "android",
    },
  ],
  web: [
    {
      name: "Chrome on Windows",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      device: "web",
    },
    {
      name: "Safari on macOS",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      device: "web",
    },
    {
      name: "Firefox on Linux",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0",
      device: "web",
    },
  ],
} as const;

export const BUILTIN_COUNTRIES: DebugCountry[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "IQ", name: "Iraq" },
];

export const BUILTIN_LANGUAGES: DebugLanguage[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
  { code: "hi", name: "Hindi" },
];

export const BUILTIN_USER_AGENTS: DebugUserAgent[] = (
  ["ios", "android", "web"] as const
).flatMap((device) =>
  UA[device].map((row) => ({
    name: row.name,
    deviceType: row.device,
    userAgent: row.userAgent,
  })),
);

type UaRow = {
  name?: string;
  userAgent?: string;
  device?: string;
  deviceType?: string;
};

/** Normalize Core `{ ios, android, web }` or legacy `{ userAgents }` into flat list. */
export function flattenUserAgents(raw: unknown): DebugUserAgent[] {
  if (!raw || typeof raw !== "object") return BUILTIN_USER_AGENTS;
  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.userAgents)) {
    return (obj.userAgents as UaRow[]).map((row) => ({
      name: row.name || "UA",
      deviceType: row.deviceType || row.device || "web",
      userAgent: row.userAgent || "",
    }));
  }

  const out: DebugUserAgent[] = [];
  for (const device of ["ios", "android", "web"] as const) {
    const list = obj[device];
    if (!Array.isArray(list)) continue;
    for (const row of list as UaRow[]) {
      out.push({
        name: row.name || device,
        deviceType: row.deviceType || row.device || device,
        userAgent: row.userAgent || "",
      });
    }
  }
  return out.length > 0 ? out : BUILTIN_USER_AGENTS;
}
