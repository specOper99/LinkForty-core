import type { Link, Webhook } from "@/lib/core/schemas";

export type NormalizedLink = {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string | null;
  description: string | null;
  isActive: boolean;
  clickCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
  iosAppStoreUrl: string | null;
  androidAppStoreUrl: string | null;
  webFallbackUrl: string | null;
  appScheme: string | null;
  iosUniversalLink: string | null;
  androidAppLink: string | null;
  deepLinkPath: string | null;
  deepLinkParameters: Record<string, unknown> | null;
  utmParameters: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  } | null;
  targetingRules: {
    countries?: string[];
    devices?: ("ios" | "android" | "web")[];
    languages?: string[];
  } | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  ogType: string | null;
  attributionWindowHours: number | null;
};

export type NormalizedWebhook = {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  isActive: boolean;
  retryCount: number | null;
  timeoutMs: number | null;
  headers: Record<string, string> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function pickString(
  ...values: Array<string | null | undefined>
): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function pickBool(
  ...values: Array<boolean | null | undefined>
): boolean | undefined {
  for (const v of values) {
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

function pickNumber(
  ...values: Array<number | string | null | undefined>
): number | null {
  for (const v of values) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

export function normalizeLink(link: Link): NormalizedLink {
  return {
    id: link.id,
    shortCode: pickString(link.shortCode, link.short_code) ?? "",
    originalUrl: pickString(link.originalUrl, link.original_url) ?? "",
    title: pickString(link.title),
    description: pickString(link.description),
    isActive: pickBool(link.isActive, link.is_active) ?? true,
    clickCount: pickNumber(link.clickCount, link.click_count) ?? 0,
    createdAt: pickString(link.created_at),
    updatedAt: pickString(link.updated_at),
    expiresAt: pickString(link.expiresAt, link.expires_at),
    iosAppStoreUrl: pickString(link.ios_app_store_url),
    androidAppStoreUrl: pickString(link.android_app_store_url),
    webFallbackUrl: pickString(link.web_fallback_url),
    appScheme: pickString(link.app_scheme),
    iosUniversalLink: pickString(link.ios_universal_link),
    androidAppLink: pickString(link.android_app_link),
    deepLinkPath: pickString(link.deep_link_path),
    deepLinkParameters:
      (link.deepLinkParameters ?? link.deep_link_parameters ?? null) as Record<
        string,
        unknown
      > | null,
    utmParameters: (link.utmParameters ?? link.utm_parameters ?? null) as NormalizedLink["utmParameters"],
    targetingRules: (link.targetingRules ??
      link.targeting_rules ??
      null) as NormalizedLink["targetingRules"],
    ogTitle: pickString(link.og_title),
    ogDescription: pickString(link.og_description),
    ogImageUrl: pickString(link.og_image_url),
    ogType: pickString(link.og_type),
    attributionWindowHours: pickNumber(link.attribution_window_hours),
  };
}

export function normalizeWebhook(webhook: Webhook): NormalizedWebhook {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    secret: pickString(webhook.secret),
    events: webhook.events ?? [],
    isActive: pickBool(webhook.isActive, webhook.is_active) ?? true,
    retryCount: pickNumber(webhook.retry_count),
    timeoutMs: pickNumber(webhook.timeout_ms),
    headers: webhook.headers ?? null,
    createdAt: pickString(webhook.created_at),
    updatedAt: pickString(webhook.updated_at),
  };
}

export function emptyToUndefined(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function optionalUrl(value: string | undefined | null): string | undefined {
  const v = emptyToUndefined(value);
  return v;
}
