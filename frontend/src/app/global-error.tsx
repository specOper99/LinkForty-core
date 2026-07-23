"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const msg = error.message || "";
  const looksLikeProxyBlock =
    /unexpected response|403|cloudflare|attention required/i.test(msg);

  return (
    <html lang="en">
      <body className="bg-[#0b0f14] text-[#e8eef6]">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
          <h1 className="font-mono text-sm uppercase tracking-[0.18em] text-[#5eead4]">
            Dashboard error
          </h1>
          <p className="text-sm text-[#9fb0c3]">{msg || "Client exception"}</p>
          {looksLikeProxyBlock ? (
            <div className="space-y-2 rounded border border-[#f59e0b]/40 p-3 text-sm text-[#fbbf24]">
              <p className="font-medium">Likely Cloudflare / WAF 403</p>
              <ul className="list-disc space-y-1 pl-4 text-[#e8eef6]">
                <li>
                  Do <strong>not</strong> host this dashboard on the public
                  shortlink hostname (e.g. links.*). Use a separate host like{" "}
                  <code className="font-mono text-[#5eead4]">
                    dashboard.yourdomain.com
                  </code>
                  .
                </li>
                <li>
                  Set <code className="font-mono">AUTH_URL</code> to that
                  dashboard HTTPS URL.
                </li>
                <li>
                  Cloudflare: turn off Bot Fight for the dashboard zone, or add
                  a WAF skip for paths starting with{" "}
                  <code className="font-mono">/_next</code> and same-origin
                  POSTs (Next.js Flight / Server Actions).
                </li>
              </ul>
            </div>
          ) : null}
          <Button type="button" onClick={() => reset()}>
            Retry
          </Button>
        </main>
      </body>
    </html>
  );
}
