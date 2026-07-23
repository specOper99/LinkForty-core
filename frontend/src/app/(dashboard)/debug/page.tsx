import { CoreApiError, getCoreClient } from "@/lib/core";
import {
  BUILTIN_COUNTRIES,
  BUILTIN_LANGUAGES,
  BUILTIN_USER_AGENTS,
  flattenUserAgents,
  type DebugCountry,
  type DebugLanguage,
  type DebugUserAgent,
} from "@/lib/core/debug-refs";
import { normalizeLink } from "@/lib/core/normalize";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { DebugConsole } from "@/app/(dashboard)/debug/debug-console";

export const dynamic = "force-dynamic";

async function softGet<T>(
  fn: () => Promise<T>,
): Promise<{ data: T | null; missing: boolean; error: string | null }> {
  try {
    return { data: await fn(), missing: false, error: null };
  } catch (err) {
    if (err instanceof CoreApiError && err.status === 404) {
      return { data: null, missing: true, error: null };
    }
    return {
      data: null,
      missing: false,
      error:
        err instanceof Error ? err.message : "Request failed",
    };
  }
}

export default async function DebugPage() {
  const client = getCoreClient();
  let linksError: string | null = null;
  let links: Array<{ id: string; label: string }> = [];
  let userAgents: DebugUserAgent[] = BUILTIN_USER_AGENTS;
  let countries: DebugCountry[] = BUILTIN_COUNTRIES;
  let languages: DebugLanguage[] = BUILTIN_LANGUAGES;
  let usedBuiltinRefs = false;
  const refErrors: string[] = [];

  try {
    const rawLinks = await client.listLinks();
    links = rawLinks.map((l) => {
      const n = normalizeLink(l);
      return {
        id: n.id,
        label: `${n.shortCode || n.id.slice(0, 8)} — ${n.title || n.originalUrl}`,
      };
    });
  } catch (err) {
    linksError =
      err instanceof CoreApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load links";
  }

  const [uaRes, countriesRes, languagesRes] = await Promise.all([
    softGet(() => client.getDebugAgents()),
    softGet(() => client.getCountries()),
    softGet(() => client.getLanguages()),
  ]);

  if (uaRes.data) {
    userAgents = flattenUserAgents(uaRes.data);
  } else if (uaRes.missing) {
    usedBuiltinRefs = true;
  } else if (uaRes.error) {
    refErrors.push(uaRes.error);
    usedBuiltinRefs = true;
  }

  if (countriesRes.data?.countries) {
    countries = countriesRes.data.countries;
  } else if (countriesRes.missing) {
    usedBuiltinRefs = true;
  } else if (countriesRes.error) {
    refErrors.push(countriesRes.error);
    usedBuiltinRefs = true;
  }

  if (languagesRes.data?.languages) {
    languages = languagesRes.data.languages;
  } else if (languagesRes.missing) {
    usedBuiltinRefs = true;
  } else if (languagesRes.error) {
    refErrors.push(languagesRes.error);
    usedBuiltinRefs = true;
  }

  return (
    <>
      <PageHeader
        title="Debug"
        description="Simulate clicks, watch live events via WS proxy, look up attribution."
      />
      {linksError ? <Alert title="Links error">{linksError}</Alert> : null}
      {usedBuiltinRefs ? (
        <Alert title="Core debug routes missing (404)">
          Vanilla LinkForty Core <code className="font-mono">createServer()</code>{" "}
          does not register <code className="font-mono">debugRoutes</code>. Using
          built-in UA/country/language presets. Simulate / live WS need Core to
          register debug routes:
          <pre className="mt-2 overflow-x-auto font-mono text-xs text-ink-muted">
            {`import { createServer, debugRoutes } from '@linkforty/core';
const server = await createServer({ /* ... */ });
await server.register(debugRoutes);`}
          </pre>
        </Alert>
      ) : null}
      {refErrors.length > 0 ? (
        <Alert title="Debug refs error">{refErrors.join(" · ")}</Alert>
      ) : null}
      <DebugConsole
        links={links}
        userAgents={userAgents}
        countries={countries}
        languages={languages}
      />
    </>
  );
}
