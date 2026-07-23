import { notFound } from "next/navigation";
import { CoreApiError, getCoreClient } from "@/lib/core";
import { normalizeLink } from "@/lib/core/normalize";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { LinkForm } from "@/app/(dashboard)/links/link-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLinkPage({ params }: Props) {
  const { id } = await params;

  try {
    const link = normalizeLink(await getCoreClient().getLink(id));
    return (
      <>
        <PageHeader
          title={`Edit ${link.shortCode || "link"}`}
          description="Update destination, targeting, UTM, and OG fields."
        />
        <LinkForm mode="edit" link={link} />
      </>
    );
  } catch (err) {
    if (err instanceof CoreApiError && err.status === 404) notFound();
    return (
      <Alert title="Failed to load link">
        {err instanceof Error ? err.message : "Unknown error"}
      </Alert>
    );
  }
}
