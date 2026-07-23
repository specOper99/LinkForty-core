import Link from "next/link";
import { CoreApiError, getCoreClient } from "@/lib/core";
import { normalizeWebhook } from "@/lib/core/normalize";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { deleteWebhookAction } from "@/app/(dashboard)/webhooks/actions";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  let webhooks: ReturnType<typeof normalizeWebhook>[] = [];
  let error: string | null = null;

  try {
    webhooks = (await getCoreClient().listWebhooks()).map(normalizeWebhook);
  } catch (err) {
    error =
      err instanceof CoreApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load webhooks";
  }

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Subscribe to Core events. Secrets shown once on create."
        actions={
          <Link href="/webhooks/new">
            <Button>New webhook</Button>
          </Link>
        }
      />

      {error ? <Alert title="Core error">{error}</Alert> : null}

      {!error && webhooks.length === 0 ? (
        <p className="text-sm text-ink-muted">No webhooks configured.</p>
      ) : null}

      {webhooks.length > 0 ? (
        <ul className="divide-y divide-ink-line">
          {webhooks.map((wh) => (
            <li
              key={wh.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <Link
                  href={`/webhooks/${wh.id}`}
                  className="font-medium text-ink-fg hover:text-signal"
                >
                  {wh.name}
                </Link>
                <p className="font-mono text-xs text-ink-muted">{wh.url}</p>
                <p className="mt-1 font-mono text-[11px] text-ink-muted">
                  {wh.events.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={wh.isActive ? "signal" : "muted"}>
                  {wh.isActive ? "active" : "inactive"}
                </Badge>
                <form action={deleteWebhookAction}>
                  <input type="hidden" name="id" value={wh.id} />
                  <Button variant="danger" type="submit">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
