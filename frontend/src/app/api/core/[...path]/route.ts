import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCoreApiToken, getCoreBaseUrl, getOperatorUserId } from "@/lib/env";
import {
  isAllowedCorePath,
  normalizeCorePath,
  pathUsesUserId,
} from "@/lib/core/allowlist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await ctx.params;
  const corePath = normalizeCorePath(segments ?? []);

  if (!corePath || !isAllowedCorePath(corePath)) {
    return NextResponse.json(
      { error: "Path not allowed", path: corePath },
      { status: 403 },
    );
  }

  const operatorId = getOperatorUserId();
  const upstream = new URL(corePath, `${getCoreBaseUrl()}/`);

  // Copy allowlisted query params; force operator userId where needed
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key === "userId" || key === "user_id") return;
    upstream.searchParams.set(key, value);
  });

  const method = req.method.toUpperCase();
  let body: string | undefined;
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("User-Agent", "LinkForty-Dashboard/1.0");
  const apiToken = getCoreApiToken();
  if (apiToken) headers.set("Authorization", `Bearer ${apiToken}`);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  if (method !== "GET" && method !== "HEAD") {
    const raw = await req.text();
    if (raw) {
      if (contentType?.includes("application/json")) {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          delete parsed.userId;
          delete parsed.user_id;
          if (pathUsesUserId(corePath)) {
            parsed.userId = operatorId;
          }
          body = JSON.stringify(parsed);
          headers.set("content-type", "application/json");
        } catch {
          body = raw;
        }
      } else {
        body = raw;
      }
    } else if (pathUsesUserId(corePath) && (method === "POST" || method === "PUT")) {
      body = JSON.stringify({ userId: operatorId });
      headers.set("content-type", "application/json");
    }
  }

  if (pathUsesUserId(corePath)) {
    upstream.searchParams.set("userId", operatorId);
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      method,
      headers,
      body,
      cache: "no-store",
      // QR / well-known may return non-JSON
      redirect: "manual",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Core unreachable",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  const passThrough = [
    "content-type",
    "content-disposition",
    "cache-control",
  ];
  for (const h of passThrough) {
    const v = upstreamRes.headers.get(h);
    if (v) outHeaders.set(h, v);
  }

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: outHeaders,
  });
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
