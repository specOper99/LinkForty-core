import Link from "next/link";
import { notFound } from "next/navigation";
import { CoreApiError, getCoreClient } from "@/lib/core";
import { normalizeWebhook } from "@/lib/core/normalize";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { deleteWebhookAction } from "@/app/(dashboard)/webhooks/actions";
import { WebhookForm } from "@/app/(dashboard)/webhooks/webhook-form";
import { TestWebhookButton } from "@/app/(dashboard)/webhooks/test-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WebhookDetailPage({ params }: Props) {
  const { id } = await params;

  let webhook;
  try {
    webhook = normalizeWebhook(await getCoreClient().getWebhook(id));
  } catch (err) {
    if (err instanceof CoreApiError && err.status === 404) notFound();
    return (
      <Alert title="Failed to load webhook">
        {err instanceof Error ? err.message : "Unknown error"}
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title={webhook.name}
        description={webhook.url}
        actions={
          <div className="flex gap-2">
            <form action={deleteWebhookAction}>
              <input type="hidden" name="id" value={webhook.id} />
              <Button variant="danger" type="submit">
                Delete
              </Button>
            </form>
            <Link href="/webhooks">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={webhook.isActive ? "signal" : "muted"}>
          {webhook.isActive ? "active" : "inactive"}
        </Badge>
        <span className="font-mono text-xs text-ink-muted">
          {webhook.events.join(" · ")}
        </span>
      </div>

      {webhook.secret ? (
        <Alert tone="muted" title="Signing secret">
          <code className="break-all font-mono text-xs text-ink-fg">
            {webhook.secret}
          </code>
        </Alert>
      ) : (
        <Alert tone="muted">
          Secret may only appear on create. Re-create webhook if lost.
        </Alert>
      )}

      <TestWebhookButton id={webhook.id} />

      <section className="mt-4">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Edit
        </h2>
        <WebhookForm mode="edit" webhook={webhook} />
      </section>
    </>
  );
}
