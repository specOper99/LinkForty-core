import Link from "next/link";
import { notFound } from "next/navigation";
import { CoreApiError, getCoreClient } from "@/lib/core";
import { normalizeLink } from "@/lib/core/normalize";
import { getShortlinkBaseUrl } from "@/lib/env";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  deleteLinkAction,
  duplicateLinkAction,
  setLinkActiveAction,
} from "@/app/(dashboard)/links/actions";
import { LinkAnalyticsPanel } from "@/app/(dashboard)/links/link-analytics-panel";
import { QrPanel } from "@/app/(dashboard)/links/qr-panel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function LinkDetailPage({ params }: Props) {
  const { id } = await params;
  const client = getCoreClient();

  let link;
  try {
    link = normalizeLink(await client.getLink(id));
  } catch (err) {
    if (err instanceof CoreApiError && err.status === 404) notFound();
    return (
      <Alert title="Failed to load link">
        {err instanceof Error ? err.message : "Unknown error"}
      </Alert>
    );
  }

  const shortBase = getShortlinkBaseUrl();
  const shortUrl = `${shortBase}/${link.shortCode}`;
  const previewUrl = `${shortBase}/${encodeURIComponent(link.shortCode)}/preview`;

  return (
    <>
      <PageHeader
        title={link.title || link.shortCode || "Link"}
        description={link.originalUrl}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/links/${link.id}/edit`}>
              <Button>Edit</Button>
            </Link>
            <form action={setLinkActiveAction}>
              <input type="hidden" name="id" value={link.id} />
              <input
                type="hidden"
                name="isActive"
                value={link.isActive ? "false" : "true"}
              />
              <Button variant="secondary" type="submit">
                {link.isActive ? "Deactivate" : "Activate"}
              </Button>
            </form>
            <form action={duplicateLinkAction}>
              <input type="hidden" name="id" value={link.id} />
              <Button variant="secondary" type="submit">
                Duplicate
              </Button>
            </form>
            <form action={deleteLinkAction}>
              <input type="hidden" name="id" value={link.id} />
              <Button variant="danger" type="submit">
                Delete
              </Button>
            </form>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={link.isActive ? "signal" : "muted"}>
          {link.isActive ? "active" : "inactive"}
        </Badge>
        <span className="font-mono text-sm text-ink-muted">
          clicks: {link.clickCount}
        </span>
        <a
          href={shortUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-sm text-signal hover:underline"
        >
          {shortUrl}
        </a>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-ink-muted hover:text-signal"
        >
          OG preview
        </a>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <QrPanel linkId={link.id} />
        <dl className="grid gap-2 font-mono text-sm">
          {(
            [
              ["id", link.id],
              ["short_code", link.shortCode],
              ["expires_at", link.expiresAt ?? "—"],
              ["app_scheme", link.appScheme ?? "—"],
              ["deep_link_path", link.deepLinkPath ?? "—"],
              ["og_title", link.ogTitle ?? "—"],
            ] as const
          ).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 border-b border-ink-line py-2"
            >
              <dt className="text-ink-muted">{k}</dt>
              <dd className="truncate text-ink-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <LinkAnalyticsPanel linkId={link.id} />
    </>
  );
}
