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
        <Alert tone="muted" title="Unexpected server response">
          Often <strong>not</strong> Cloudflare when DNS is grey-cloud. Check:{" "}
          <code className="font-mono">AUTH_URL</code> matches this hostname
          exactly, rebuild dashboard so Server Actions allow that origin, and
          keep dashboard on its own host (not the shortlink domain). If Cloudflare
          is orange-proxied, also skip Bot Fight for{" "}
          <code className="font-mono">/_next/*</code>.
        </Alert>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Retry
      </Button>
    </div>
  );
}
