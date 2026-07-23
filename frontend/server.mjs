/**
 * Custom Next.js server with authenticated WebSocket proxy for Core live debug.
 *
 * Browser → ws(s)://dashboard/api/debug/live
 * Server → ws(s)://CORE_URL/api/debug/live?userId=OPERATOR_USER_ID
 *
 * Use: node server.mjs  (dev + prod). Plain `next start` has no WS upgrade.
 */
import { createServer } from "node:http";
import { parse as parseUrl } from "node:url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { decode } from "next-auth/jwt";

const dev =
  process.env.NODE_ENV !== "production" &&
  process.env.E2E_PROD_SERVER !== "1";
// Docker sets HOSTNAME to the container id — do NOT use it as listen address.
// Prefer HOST / LISTEN_HOST; default 0.0.0.0 so reverse proxies can reach the app.
const hostname =
  process.env.HOST ||
  process.env.LISTEN_HOST ||
  "0.0.0.0";
const port = Number(process.env.PORT || 3001);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/** Match src/lib/env.ts — strip trailing slash and accidental `/api` suffix. */
function normalizeCoreUrl(raw) {
  let u = String(raw || "")
    .trim()
    .replace(/\/+$/, "");
  if (/\/api$/i.test(u)) u = u.replace(/\/api$/i, "");
  return u;
}

function coreWsBase() {
  const core = normalizeCoreUrl(process.env.CORE_URL);
  if (!core) throw new Error("CORE_URL required");
  return core.replace(/^http/, "ws");
}

function readCookie(header, name) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    if (trimmed.slice(0, i) === name) {
      return decodeURIComponent(trimmed.slice(i + 1));
    }
  }
  return undefined;
}

await app.prepare();

const server = createServer((req, res) => {
  const parsedUrl = parseUrl(req.url || "", true);
  handle(req, res, parsedUrl);
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (req, socket, head) => {
  try {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== "/api/debug/live") {
      socket.destroy();
      return;
    }

    const cookieName =
      process.env.COOKIE_SECURE === "true" ||
      (process.env.NODE_ENV === "production" &&
        (process.env.AUTH_URL || "").startsWith("https://"))
        ? "__Secure-authjs.session-token"
        : "authjs.session-token";

    const rawToken = readCookie(req.headers.cookie, cookieName);
    const token = rawToken
      ? await decode({
          token: rawToken,
          secret: process.env.AUTH_SECRET,
        })
      : null;

    if (!token?.sub) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const operatorId = String(process.env.OPERATOR_USER_ID || "").trim();
    if (!operatorId) {
      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      socket.destroy();
      return;
    }

    const upstreamUrl = new URL("/api/debug/live", `${coreWsBase()}/`);
    upstreamUrl.searchParams.set("userId", operatorId);
    const linkId = url.searchParams.get("linkId");
    if (linkId) upstreamUrl.searchParams.set("linkId", linkId);

    wss.handleUpgrade(req, socket, head, (client) => {
      const upstream = new WebSocket(upstreamUrl.toString());

      upstream.on("open", () => {
        client.send(JSON.stringify({ type: "proxy", status: "connected" }));
      });

      upstream.on("message", (data, isBinary) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data, { binary: isBinary });
        }
      });

      upstream.on("close", () => {
        if (client.readyState === WebSocket.OPEN) client.close();
      });

      upstream.on("error", (err) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "proxy_error",
              message: err.message,
            }),
          );
          client.close();
        }
      });

      client.on("message", (data, isBinary) => {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(data, { binary: isBinary });
        }
      });

      client.on("close", () => {
        if (
          upstream.readyState === WebSocket.OPEN ||
          upstream.readyState === WebSocket.CONNECTING
        ) {
          upstream.close();
        }
      });
    });
  } catch {
    socket.destroy();
  }
});

server.listen(port, hostname, () => {
  const core = normalizeCoreUrl(process.env.CORE_URL);
  console.log(`> LinkForty dashboard ready on http://${hostname}:${port}`);
  console.log(`> WS proxy: /api/debug/live → ${core}/api/debug/live`);
});
