import { CoreApiError, getCoreClient } from "@/lib/core";
import { getEnv } from "@/lib/env";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

type ProbeStatus = "ok" | "warn" | "fail" | "skip";

type Probe = {
  label: string;
  status: ProbeStatus;
  detail: string;
};

function errorBodyMessage(err: CoreApiError): string | null {
  const body = err.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const msg = (body as { message?: unknown }).message;
  return typeof msg === "string" ? msg : null;
}

function isConfigMissing404(err: CoreApiError): boolean {
  if (err.status !== 404) return false;
  const body = err.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const error = (body as { error?: unknown }).error;
  return error === "Configuration missing";
}

export default async function SettingsPage() {
  const env = getEnv();
  const client = getCoreClient();
  const probes: Probe[] = [];

  // Primary connectivity — @linkforty/core ships this; /health often does not exist.
  try {
    const data = await client.getSdkHealth();
    probes.push({
      label: "GET /api/sdk/v1/health",
      status: "ok",
      detail: JSON.stringify(data),
    });
  } catch (err) {
    probes.push({
      label: "GET /api/sdk/v1/health",
      status: "fail",
      detail:
        err instanceof CoreApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Core unreachable",
    });
  }

  // Optional legacy / Docker probe — not in createServer() for core@1.20
  try {
    const data = await client.getHealth();
    probes.push({
      label: "GET /health",
      status: "ok",
      detail: JSON.stringify(data),
    });
  } catch (err) {
    if (err instanceof CoreApiError && err.status === 404) {
      probes.push({
        label: "GET /health",
        status: "skip",
        detail:
          "Not registered by @linkforty/core createServer() — use /api/sdk/v1/health",
      });
    } else {
      probes.push({
        label: "GET /health",
        status: "fail",
        detail:
          err instanceof CoreApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed",
      });
    }
  }

  try {
    const data = await client.getAppleAppSiteAssociation();
    probes.push({
      label: "GET /.well-known/apple-app-site-association",
      status: "ok",
      detail: JSON.stringify(data).slice(0, 240),
    });
  } catch (err) {
    if (err instanceof CoreApiError && isConfigMissing404(err)) {
      probes.push({
        label: "GET /.well-known/apple-app-site-association",
        status: "warn",
        detail:
          errorBodyMessage(err) ||
          "Set Core env IOS_TEAM_ID + IOS_BUNDLE_ID (Universal Links)",
      });
    } else if (err instanceof CoreApiError && err.status === 404) {
      probes.push({
        label: "GET /.well-known/apple-app-site-association",
        status: "warn",
        detail:
          "404 — set Core IOS_TEAM_ID + IOS_BUNDLE_ID, or wellKnownRoutes not reached",
      });
    } else {
      probes.push({
        label: "GET /.well-known/apple-app-site-association",
        status: "fail",
        detail:
          err instanceof CoreApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed",
      });
    }
  }

  try {
    const data = await client.getAssetLinks();
    probes.push({
      label: "GET /.well-known/assetlinks.json",
      status: "ok",
      detail: JSON.stringify(data).slice(0, 240),
    });
  } catch (err) {
    if (err instanceof CoreApiError && isConfigMissing404(err)) {
      probes.push({
        label: "GET /.well-known/assetlinks.json",
        status: "warn",
        detail:
          errorBodyMessage(err) ||
          "Set Core env ANDROID_PACKAGE_NAME + ANDROID_SHA256_FINGERPRINTS",
      });
    } else if (err instanceof CoreApiError && err.status === 404) {
      probes.push({
        label: "GET /.well-known/assetlinks.json",
        status: "warn",
        detail:
          "404 — set Core ANDROID_PACKAGE_NAME + ANDROID_SHA256_FINGERPRINTS",
      });
    } else {
      probes.push({
        label: "GET /.well-known/assetlinks.json",
        status: "fail",
        detail:
          err instanceof CoreApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed",
      });
    }
  }

  const badgeTone = (s: ProbeStatus): "signal" | "danger" | "warn" | "muted" => {
    if (s === "ok") return "signal";
    if (s === "fail") return "danger";
    if (s === "warn") return "warn";
    return "muted";
  };

  const badgeLabel = (s: ProbeStatus) => {
    if (s === "ok") return "ok";
    if (s === "fail") return "fail";
    if (s === "warn") return "warn";
    return "n/a";
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Connection health, well-known verification, and operator scope."
      />

      <section className="grid gap-2 font-mono text-sm">
        <Row k="CORE_URL" v={env.CORE_URL} />
        <Row
          k="SHORTLINK_BASE_URL"
          v={env.SHORTLINK_BASE_URL ?? "(defaults to CORE_URL)"}
        />
        <Row k="OPERATOR_USER_ID" v={env.OPERATOR_USER_ID} />
        <Row k="ADMIN_USERNAME" v={env.ADMIN_USERNAME} />
        <Row k="AUTH_URL" v={env.AUTH_URL ?? "(unset)"} />
        <Row k="NODE_ENV" v={env.NODE_ENV} />
        <Row k="BFF proxy" v="/api/core/*" />
        <Row k="Live WS proxy" v="/api/debug/live → Core WS" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Health probes
        </h2>
        <Alert tone="muted">
          Connectivity = <code className="font-mono">/api/sdk/v1/health</code>.{" "}
          <code className="font-mono">/health</code> is often absent. Well-known
          files return 404 until Core has iOS/Android env set.
        </Alert>
        {probes.map((p) => (
          <div
            key={p.label}
            className="flex flex-col gap-1 border-b border-ink-line py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex items-center gap-2">
              <Badge tone={badgeTone(p.status)}>{badgeLabel(p.status)}</Badge>
              <span className="font-mono text-sm text-ink-fg">{p.label}</span>
            </div>
            <code className="max-w-xl text-xs text-ink-muted sm:text-right">
              {p.detail}
            </code>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Production checklist
        </h2>
        <Alert tone="muted">
          <ul className="list-disc space-y-1 pl-4 text-ink-fg">
            <li>
              Set Core <code className="font-mono text-signal">CORS_ORIGIN</code>{" "}
              to this dashboard origin only (no wildcards).
            </li>
            <li>
              Keep Core on a private network; expose only this BFF publicly for
              management. Shortlink traffic may still hit Core&apos;s public
              redirect host.
            </li>
            <li>
              Never set{" "}
              <code className="font-mono text-signal">CORE_URL</code> to a
              Cloudflare-proxied public hostname — Bot Fight / WAF returns 403
              to the server. Use Docker DNS / private IP; put the public domain
              in{" "}
              <code className="font-mono text-signal">SHORTLINK_BASE_URL</code>.
            </li>
            <li>
              Set <code className="font-mono text-signal">SHORTLINK_BASE_URL</code>{" "}
              to the public shortlink domain so the UI never shows a private{" "}
              <code className="font-mono">CORE_URL</code>.
            </li>
            <li>
              Universal Links: Core env{" "}
              <code className="font-mono text-signal">IOS_TEAM_ID</code> +{" "}
              <code className="font-mono text-signal">IOS_BUNDLE_ID</code>.
            </li>
            <li>
              App Links: Core env{" "}
              <code className="font-mono text-signal">ANDROID_PACKAGE_NAME</code>{" "}
              +{" "}
              <code className="font-mono text-signal">
                ANDROID_SHA256_FINGERPRINTS
              </code>
              .
            </li>
            <li>
              Use <code className="font-mono text-signal">ADMIN_PASSWORD_HASH</code>{" "}
              (bcrypt) in production — never plain{" "}
              <code className="font-mono">ADMIN_PASSWORD</code>.
            </li>
            <li>
              Run dashboard via{" "}
              <code className="font-mono text-signal">node server.mjs</code> so
              the WebSocket live proxy is available.
            </li>
            <li>
              Set <code className="font-mono text-signal">AUTH_URL</code> to the
              public dashboard URL; rotate{" "}
              <code className="font-mono">AUTH_SECRET</code> if compromised.
            </li>
          </ul>
        </Alert>
      </section>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-line py-2">
      <span className="text-ink-muted">{k}</span>
      <span className="truncate text-ink-fg">{v}</span>
    </div>
  );
}
