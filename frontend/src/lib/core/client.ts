import {
  getCoreApiToken,
  getCoreBaseUrl,
  getOperatorUserId,
  getShortlinkBaseUrl,
} from "@/lib/env";
import {
  analyticsOverviewSchema,
  appleAppSiteAssociationSchema,
  assetLinksSchema,
  attributionResponseSchema,
  countriesResponseSchema,
  createLinkRequestSchema,
  createWebhookRequestSchema,
  deleteSuccessSchema,
  healthSchema,
  languagesResponseSchema,
  linkAnalyticsSchema,
  linkListSchema,
  linkSchema,
  sdkHealthSchema,
  simulateRequestSchema,
  simulateResponseSchema,
  updateLinkRequestSchema,
  updateWebhookRequestSchema,
  userAgentsResponseSchema,
  webhookListSchema,
  webhookSchema,
  webhookTestResultSchema,
  type CreateLinkRequest,
  type CreateWebhookRequest,
  type SimulateRequest,
  type UpdateLinkRequest,
  type UpdateWebhookRequest,
} from "@/lib/core/schemas";
import type { z } from "zod";

export class CoreApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "CoreApiError";
  }
}

function looksLikeCloudflareChallenge(body: unknown): boolean {
  if (typeof body !== "string") return false;
  const s = body.toLowerCase();
  return (
    s.includes("cloudflare") ||
    s.includes("attention required") ||
    s.includes("cf-browser-verification") ||
    s.includes("just a moment")
  );
}

function coreFailureMessage(
  method: string,
  path: string,
  status: number,
  body: unknown,
): string {
  if (status === 403 && looksLikeCloudflareChallenge(body)) {
    return (
      `Core ${method} ${path} blocked by Cloudflare (403). ` +
      `Set CORE_URL to the private/internal Core origin (Docker network, localhost, or origin IP) — ` +
      `not the public Cloudflare hostname. Keep SHORTLINK_BASE_URL as the public shortlink domain.`
    );
  }
  if (status === 403) {
    return (
      `Core ${method} ${path} failed (403). ` +
      `If Core sits behind Cloudflare/WAF, use an internal CORE_URL. ` +
      `If Core requires a Bearer token, set CORE_API_TOKEN.`
    );
  }
  if (status === 401) {
    return (
      `Core ${method} ${path} unauthorized (401). ` +
      `Set CORE_API_TOKEN to a valid Bearer token if your Core/gateway requires auth.`
    );
  }
  return `Core ${method} ${path} failed (${status})`;
}

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type CoreClientOptions = {
  baseUrl?: string;
  userId?: string;
  apiToken?: string;
  fetchImpl?: typeof fetch;
};

function stripUserIdFromBody(body: JsonValue): JsonValue {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const next = { ...(body as Record<string, unknown>) };
    delete next.userId;
    delete next.user_id;
    return next;
  }
  return body;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function parseWith<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new CoreApiError(
      `Invalid Core response for ${label}: ${result.error.message}`,
      502,
      result.error.flatten(),
    );
  }
  return result.data;
}

/**
 * Server-only typed LinkForty Core HTTP client.
 * Always injects OPERATOR_USER_ID; never trust client-supplied userId.
 */
export class CoreClient {
  private readonly baseUrl: string;
  private readonly userId: string;
  private readonly apiToken: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CoreClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? getCoreBaseUrl()).replace(/\/$/, "");
    this.userId = options.userId ?? getOperatorUserId();
    this.apiToken = options.apiToken ?? getCoreApiToken();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private url(path: string, query?: Record<string, string | number | undefined>) {
    const u = new URL(path.replace(/^\//, ""), `${this.baseUrl}/`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
      }
    }
    return u;
  }

  private async request(
    method: string,
    path: string,
    {
      query,
      body,
      injectUserId = true,
      raw = false,
    }: {
      query?: Record<string, string | number | undefined>;
      body?: JsonValue;
      injectUserId?: boolean;
      raw?: boolean;
    } = {},
  ): Promise<Response> {
    const q = { ...(query ?? {}) };
    let payload = body;

    if (injectUserId) {
      q.userId = this.userId;
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        payload = {
          ...(stripUserIdFromBody(payload) as Record<string, unknown>),
          userId: this.userId,
        };
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "LinkForty-Dashboard/1.0",
    };
    if (this.apiToken) {
      headers.Authorization = `Bearer ${this.apiToken}`;
    }
    if (payload !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await this.fetchImpl(this.url(path, q), {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      cache: "no-store",
    });

    if (raw) return res;

    if (!res.ok) {
      const errBody = await parseJsonSafe(res);
      throw new CoreApiError(
        coreFailureMessage(method, path, res.status, errBody),
        res.status,
        errBody,
      );
    }

    return res;
  }

  private async json<T>(
    method: string,
    path: string,
    schema: z.ZodType<T>,
    options?: {
      query?: Record<string, string | number | undefined>;
      body?: JsonValue;
      injectUserId?: boolean;
      label?: string;
    },
  ): Promise<T> {
    const res = await this.request(method, path, options);
    const data = await parseJsonSafe(res);
    return parseWith(schema, data, options?.label ?? `${method} ${path}`);
  }

  /* ---------- Health ---------- */

  getHealth() {
    return this.json("GET", "/health", healthSchema, {
      injectUserId: false,
      label: "GET /health",
    });
  }

  getSdkHealth() {
    return this.json("GET", "/api/sdk/v1/health", sdkHealthSchema, {
      injectUserId: false,
      label: "GET /api/sdk/v1/health",
    });
  }

  /* ---------- Links ---------- */

  listLinks() {
    return this.json("GET", "/api/links", linkListSchema, {
      label: "GET /api/links",
    });
  }

  getLink(id: string) {
    return this.json("GET", `/api/links/${id}`, linkSchema, {
      label: "GET /api/links/:id",
    });
  }

  createLink(input: CreateLinkRequest) {
    const body = createLinkRequestSchema.parse(input);
    return this.json("POST", "/api/links", linkSchema, {
      body: body as JsonValue,
      label: "POST /api/links",
    });
  }

  updateLink(id: string, input: UpdateLinkRequest) {
    const body = updateLinkRequestSchema.parse(input);
    return this.json("PUT", `/api/links/${id}`, linkSchema, {
      body: body as JsonValue,
      label: "PUT /api/links/:id",
    });
  }

  duplicateLink(id: string) {
    return this.json("POST", `/api/links/${id}/duplicate`, linkSchema, {
      label: "POST /api/links/:id/duplicate",
    });
  }

  deleteLink(id: string) {
    return this.json("DELETE", `/api/links/${id}`, deleteSuccessSchema, {
      label: "DELETE /api/links/:id",
    });
  }

  async getLinkQr(
    id: string,
    query: { format?: "png" | "svg"; size?: number; color?: string; bgcolor?: string } = {},
  ): Promise<{ contentType: string; body: ArrayBuffer }> {
    const res = await this.request("GET", `/api/links/${id}/qr`, {
      query: {
        format: query.format,
        size: query.size,
        color: query.color,
        bgcolor: query.bgcolor,
      },
      injectUserId: true,
      raw: true,
    });
    if (!res.ok) {
      const errBody = await parseJsonSafe(res);
      throw new CoreApiError(
        coreFailureMessage("GET", `/api/links/${id}/qr`, res.status, errBody),
        res.status,
        errBody,
      );
    }
    return {
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      body: await res.arrayBuffer(),
    };
  }

  /* ---------- Analytics ---------- */

  getAnalyticsOverview(days = 30) {
    return this.json("GET", "/api/analytics/overview", analyticsOverviewSchema, {
      query: { days },
      label: "GET /api/analytics/overview",
    });
  }

  getLinkAnalytics(linkId: string, days = 30) {
    return this.json(
      "GET",
      `/api/analytics/links/${linkId}`,
      linkAnalyticsSchema,
      {
        query: { days },
        label: "GET /api/analytics/links/:id",
      },
    );
  }

  /* ---------- Webhooks ---------- */

  listWebhooks() {
    return this.json("GET", "/api/webhooks", webhookListSchema, {
      label: "GET /api/webhooks",
    });
  }

  getWebhook(id: string) {
    return this.json("GET", `/api/webhooks/${id}`, webhookSchema, {
      label: "GET /api/webhooks/:id",
    });
  }

  createWebhook(input: CreateWebhookRequest) {
    const body = createWebhookRequestSchema.parse(input);
    return this.json("POST", "/api/webhooks", webhookSchema, {
      body: body as JsonValue,
      label: "POST /api/webhooks",
    });
  }

  updateWebhook(id: string, input: UpdateWebhookRequest) {
    const body = updateWebhookRequestSchema.parse(input);
    return this.json("PUT", `/api/webhooks/${id}`, webhookSchema, {
      body: body as JsonValue,
      label: "PUT /api/webhooks/:id",
    });
  }

  deleteWebhook(id: string) {
    return this.json("DELETE", `/api/webhooks/${id}`, deleteSuccessSchema, {
      label: "DELETE /api/webhooks/:id",
    });
  }

  testWebhook(id: string) {
    return this.json("POST", `/api/webhooks/${id}/test`, webhookTestResultSchema, {
      label: "POST /api/webhooks/:id/test",
    });
  }

  /* ---------- Debug ---------- */

  simulateClick(input: SimulateRequest) {
    const body = simulateRequestSchema.parse(input);
    return this.json("POST", "/api/debug/simulate", simulateResponseSchema, {
      body: body as JsonValue,
      label: "POST /api/debug/simulate",
    });
  }

  getDebugAgents() {
    return this.json("GET", "/api/debug/user-agents", userAgentsResponseSchema, {
      injectUserId: false,
      label: "GET /api/debug/user-agents",
    });
  }

  getCountries() {
    return this.json("GET", "/api/debug/countries", countriesResponseSchema, {
      injectUserId: false,
      label: "GET /api/debug/countries",
    });
  }

  getLanguages() {
    return this.json("GET", "/api/debug/languages", languagesResponseSchema, {
      injectUserId: false,
      label: "GET /api/debug/languages",
    });
  }

  /** Server-side WS URL for live debug (proxy later). Injects operator userId. */
  getLiveDebugWsUrl(linkId?: string): string {
    const base = this.baseUrl.replace(/^http/, "ws");
    const u = new URL("/api/debug/live", `${base}/`);
    u.searchParams.set("userId", this.userId);
    if (linkId) u.searchParams.set("linkId", linkId);
    return u.toString();
  }

  /* ---------- Attribution / well-known ---------- */

  getAttribution(fingerprint: string) {
    return this.json(
      "GET",
      `/api/sdk/v1/attribution/${encodeURIComponent(fingerprint)}`,
      attributionResponseSchema,
      {
        injectUserId: false,
        label: "GET /api/sdk/v1/attribution/:fingerprint",
      },
    );
  }

  getAppleAppSiteAssociation() {
    return this.json(
      "GET",
      "/.well-known/apple-app-site-association",
      appleAppSiteAssociationSchema,
      {
        injectUserId: false,
        label: "GET /.well-known/apple-app-site-association",
      },
    );
  }

  getAssetLinks() {
    return this.json(
      "GET",
      "/.well-known/assetlinks.json",
      assetLinksSchema,
      {
        injectUserId: false,
        label: "GET /.well-known/assetlinks.json",
      },
    );
  }

  /** Build preview URL for public shortlink host. */
  previewUrl(shortCode: string): string {
    return `${getShortlinkBaseUrl()}/${encodeURIComponent(shortCode)}/preview`;
  }
}

let singleton: CoreClient | null = null;

export function getCoreClient(): CoreClient {
  if (!singleton) singleton = new CoreClient();
  return singleton;
}
