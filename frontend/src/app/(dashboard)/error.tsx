"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const msg = error.message || "Something went wrong";
  const looksLikeProxyBlock =
    /unexpected response|403|cloudflare/i.test(msg);

  return (
    <div className="flex flex-col gap-4">
      <Alert title="Page error">{msg}</Alert>
      {looksLikeProxyBlock ? (
        <Alert tone="muted" title="403 / unexpected server response">
          Cloudflare Bot Fight often blocks Next.js RSC and Server Action
          requests. Put the dashboard on its own hostname (not{" "}
          <code className="font-mono">links.*</code>), set{" "}
          <code className="font-mono">AUTH_URL</code>, and skip Bot Fight / WAF
          for <code className="font-mono">/_next/*</code>.
        </Alert>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Retry
      </Button>
    </div>
  );
}
