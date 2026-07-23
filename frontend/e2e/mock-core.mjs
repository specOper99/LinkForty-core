import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";

const OPERATOR = "00000000-0000-4000-8000-000000000001";
const LINK_ID = "11111111-1111-4111-8111-111111111111";
const WEBHOOK_ID = "22222222-2222-4222-8222-222222222222";

/** @type {Map<string, Record<string, unknown>>} */
const links = new Map();
/** @type {Map<string, Record<string, unknown>>} */
const webhooks = new Map();

function seed() {
  links.clear();
  webhooks.clear();
  links.set(LINK_ID, {
    id: LINK_ID,
    user_id: OPERATOR,
    short_code: "demo",
    original_url: "https://example.com/landing",
    title: "Demo link",
    description: "Mocked Core link",
    is_active: true,
    click_count: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    utm_parameters: { source: "newsletter" },
    targeting_rules: { devices: ["ios"] },
    og_title: "Demo",
  });
  webhooks.set(WEBHOOK_ID, {
    id: WEBHOOK_ID,
    user_id: OPERATOR,
    name: "Ops hook",
    url: "https://example.com/hooks",
    secret: "whsec_test_secret",
    events: ["click_event"],
    is_active: true,
    retry_count: 3,
    timeout_ms: 10000,
    headers: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

seed();

const analytics = {
  totalClicks: 42,
  uniqueClicks: 30,
  clicksByDate: [
    { date: "2026-07-20", clicks: 10 },
    { date: "2026-07-21", clicks: 32 },
  ],
  clicksByCountry: [{ countryCode: "US", country: "United States", clicks: 20 }],
  clicksByDevice: [{ device: "ios", clicks: 25 }],
  clicksByPlatform: [{ platform: "mobile", clicks: 25 }],
  topLinks: [
    {
      id: LINK_ID,
      shortCode: "demo",
      title: "Demo link",
      originalUrl: "https://example.com/landing",
      totalClicks: 12,
      uniqueClicks: 10,
    },
  ],
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
  });
}

function linkIdFromPath(path) {
  const m = path.match(/^\/api\/links\/([^/]+)(?:\/(duplicate|qr))?$/);
  return m ? { id: m[1], action: m[2] || null } : null;
}

function webhookIdFromPath(path) {
  const m = path.match(/^\/api\/webhooks\/([^/]+)(?:\/(test))?$/);
  return m ? { id: m[1], action: m[2] || null } : null;
}

export function startMockCore(port = 0) {
  seed();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1`);
    const path = url.pathname;
    const method = (req.method || "GET").toUpperCase();
    const body = method === "GET" || method === "HEAD" ? null : await readBody(req);

    if (path === "/health") {
      return json(res, 200, { status: "ok" });
    }
    if (path === "/api/sdk/v1/health") {
      return json(res, 200, {
        status: "ok",
        version: "mock",
        timestamp: new Date().toISOString(),
      });
    }
    if (path === "/.well-known/apple-app-site-association") {
      return json(res, 200, { applinks: { apps: [], details: [] } });
    }
    if (path === "/.well-known/assetlinks.json") {
      return json(res, 200, [{ relation: ["delegate_permission/common.handle_all_urls"] }]);
    }

    if (path === "/api/links" && method === "GET") {
      return json(res, 200, [...links.values()]);
    }
    if (path === "/api/links" && method === "POST") {
      const id = randomUUID();
      const short =
        (body && typeof body === "object" && body.customCode) ||
        `l${id.slice(0, 8)}`;
      const created = {
        id,
        user_id: OPERATOR,
        short_code: short,
        original_url:
          (body && typeof body === "object" && body.originalUrl) ||
          "https://example.com",
        title: (body && typeof body === "object" && body.title) || "Created",
        description:
          (body && typeof body === "object" && body.description) || null,
        is_active: true,
        click_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        utm_parameters:
          (body && typeof body === "object" && body.utmParameters) || null,
        targeting_rules:
          (body && typeof body === "object" && body.targetingRules) || null,
        og_title: (body && typeof body === "object" && body.ogTitle) || null,
      };
      links.set(id, created);
      return json(res, 201, created);
    }

    const linkMatch = linkIdFromPath(path);
    if (linkMatch) {
      const existing = links.get(linkMatch.id);
      if (!existing) return json(res, 404, { error: "link not found" });

      if (linkMatch.action === "qr") {
        const png = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "base64",
        );
        res.writeHead(200, { "content-type": "image/png" });
        return res.end(png);
      }
      if (linkMatch.action === "duplicate" && method === "POST") {
        const id = randomUUID();
        const copy = {
          ...existing,
          id,
          short_code: `${existing.short_code}-copy`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        links.set(id, copy);
        return json(res, 200, copy);
      }
      if (method === "GET") return json(res, 200, existing);
      if (method === "PUT") {
        const next = {
          ...existing,
          ...(body && typeof body === "object" ? body : {}),
          id: existing.id,
          updated_at: new Date().toISOString(),
        };
        if (body && typeof body === "object") {
          if (body.originalUrl) next.original_url = body.originalUrl;
          if (body.title !== undefined) next.title = body.title;
          if (typeof body.isActive === "boolean") next.is_active = body.isActive;
        }
        links.set(existing.id, next);
        return json(res, 200, next);
      }
      if (method === "DELETE") {
        links.delete(existing.id);
        return json(res, 200, { success: true });
      }
    }

    if (path === "/api/analytics/overview") {
      return json(res, 200, analytics);
    }
    if (path.startsWith("/api/analytics/links/")) {
      return json(res, 200, { ...analytics, topLinks: [] });
    }

    if (path === "/api/webhooks" && method === "GET") {
      return json(res, 200, [...webhooks.values()]);
    }
    if (path === "/api/webhooks" && method === "POST") {
      const id = randomUUID();
      const created = {
        id,
        user_id: OPERATOR,
        name: (body && typeof body === "object" && body.name) || "New",
        url:
          (body && typeof body === "object" && body.url) ||
          "https://example.com/hooks",
        secret: "whsec_once_" + id.slice(0, 8),
        events:
          (body && typeof body === "object" && body.events) || ["click_event"],
        is_active: true,
        retry_count:
          (body && typeof body === "object" && body.retryCount) || 3,
        timeout_ms:
          (body && typeof body === "object" && body.timeoutMs) || 10000,
        headers:
          (body && typeof body === "object" && body.headers) || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      webhooks.set(id, created);
      return json(res, 201, created);
    }

    const whMatch = webhookIdFromPath(path);
    if (whMatch) {
      const existing = webhooks.get(whMatch.id);
      if (!existing) return json(res, 404, { error: "webhook not found" });
      if (whMatch.action === "test" && method === "POST") {
        return json(res, 200, { success: true, status: 200, message: "ok" });
      }
      if (method === "GET") return json(res, 200, existing);
      if (method === "PUT") {
        const next = {
          ...existing,
          updated_at: new Date().toISOString(),
        };
        if (body && typeof body === "object") {
          if (body.name) next.name = body.name;
          if (body.url) next.url = body.url;
          if (body.events) next.events = body.events;
          if (typeof body.isActive === "boolean") next.is_active = body.isActive;
          if (body.retryCount) next.retry_count = body.retryCount;
          if (body.timeoutMs) next.timeout_ms = body.timeoutMs;
          if (body.headers) next.headers = body.headers;
        }
        webhooks.set(existing.id, next);
        return json(res, 200, next);
      }
      if (method === "DELETE") {
        webhooks.delete(existing.id);
        return json(res, 200, { success: true });
      }
    }

    if (path === "/api/debug/simulate" && method === "POST") {
      const linkId =
        (body && typeof body === "object" && body.linkId) || LINK_ID;
      const link = links.get(linkId) || links.get(LINK_ID);
      return json(res, 200, {
        linkId,
        shortCode: link?.short_code || "demo",
        deviceType:
          (body && typeof body === "object" && body.deviceType) || "ios",
        redirectUrl: "https://apps.apple.com/app/id1",
        targetingMatched: true,
        targetingDetails: {
          countryMatch: true,
          deviceMatch: true,
          languageMatch: null,
        },
      });
    }
    if (path === "/api/debug/user-agents") {
      return json(res, 200, {
        ios: [
          {
            name: "iPhone Safari",
            device: "ios",
            userAgent:
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
          },
        ],
        android: [],
        web: [],
      });
    }
    if (path === "/api/debug/countries") {
      return json(res, 200, {
        countries: [
          { code: "US", name: "United States" },
          { code: "IQ", name: "Iraq" },
        ],
      });
    }
    if (path === "/api/debug/languages") {
      return json(res, 200, {
        languages: [
          { code: "en", name: "English" },
          { code: "ar", name: "Arabic" },
        ],
      });
    }
    if (path.startsWith("/api/sdk/v1/attribution/")) {
      return json(res, 200, {
        fingerprint: path.split("/").pop(),
        matched: false,
      });
    }

    return json(res, 404, { error: "not found", path });
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname !== "/api/debug/live") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.send(JSON.stringify({ type: "click", shortCode: "demo", deviceType: "ios" }));
      const timer = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "click",
              shortCode: "demo",
              ts: Date.now(),
            }),
          );
        }
      }, 1000);
      ws.on("close", () => clearInterval(timer));
    });
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      resolve({
        server,
        port: actualPort,
        baseUrl: `http://127.0.0.1:${actualPort}`,
        LINK_ID,
        WEBHOOK_ID,
        OPERATOR,
        async close() {
          wss.close();
          await new Promise((r) => server.close(r));
        },
      });
    });
  });
}

const mock = await startMockCore(Number(process.env.MOCK_CORE_PORT || 3099));
console.log(`Mock Core listening on ${mock.baseUrl}`);
