import Link from "next/link";
import { CoreApiError, getCoreClient } from "@/lib/core";
import { normalizeLink } from "@/lib/core/normalize";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  deleteLinkAction,
  duplicateLinkAction,
  setLinkActiveAction,
} from "@/app/(dashboard)/links/actions";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  let links: ReturnType<typeof normalizeLink>[] = [];
  let error: string | null = null;

  try {
    const raw = await getCoreClient().listLinks();
    links = raw.map(normalizeLink);
  } catch (err) {
    error =
      err instanceof CoreApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load links";
  }

  return (
    <>
      <PageHeader
        title="Links"
        description="Create and manage smart links. Mutations go through the BFF; Core stays private."
        actions={
          <Link href="/links/new">
            <Button>New link</Button>
          </Link>
        }
      />

      {error ? <Alert title="Core error">{error}</Alert> : null}

      {!error && links.length === 0 ? (
        <p className="text-sm text-ink-muted">No links yet. Create the first one.</p>
      ) : null}

      {links.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink-line font-mono text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Clicks</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-ink-line/70">
                  <td className="py-3 pr-3 font-mono text-signal">
                    <Link href={`/links/${link.id}`} className="hover:underline">
                      {link.shortCode || link.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="text-ink-fg">{link.title || "—"}</div>
                    <div className="max-w-xs truncate font-mono text-xs text-ink-muted">
                      {link.originalUrl}
                    </div>
                  </td>
                  <td className="py-3 pr-3 font-mono">{link.clickCount}</td>
                  <td className="py-3 pr-3">
                    <Badge tone={link.isActive ? "signal" : "muted"}>
                      {link.isActive ? "active" : "inactive"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/links/${link.id}/edit`}>
                        <Button variant="secondary" type="button">
                          Edit
                        </Button>
                      </Link>
                      <form action={setLinkActiveAction}>
                        <input type="hidden" name="id" value={link.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={link.isActive ? "false" : "true"}
                        />
                        <Button variant="ghost" type="submit">
                          {link.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                      <form action={duplicateLinkAction}>
                        <input type="hidden" name="id" value={link.id} />
                        <Button variant="ghost" type="submit">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
