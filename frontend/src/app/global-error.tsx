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
              <p className="font-medium">Unexpected server response</p>
              <ul className="list-disc space-y-1 pl-4 text-[#e8eef6]">
                <li>
                  Grey-cloud DNS only? Usually <strong>not</strong> Cloudflare.
                  Rebuild dashboard with{" "}
                  <code className="font-mono text-[#5eead4]">AUTH_URL</code>{" "}
                  equal to this exact HTTPS host (Server Actions origin is baked
                  at build).
                </li>
                <li>
                  Do <strong>not</strong> put the dashboard on the shortlink
                  hostname. Use a separate host (e.g.{" "}
                  <code className="font-mono text-[#5eead4]">
                    links-dash.example.com
                  </code>
                  ).
                </li>
                <li>
                  If Cloudflare is orange-proxied: disable Bot Fight for this
                  host, or WAF skip for{" "}
                  <code className="font-mono">/_next</code> + Server Action
                  POSTs.
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
