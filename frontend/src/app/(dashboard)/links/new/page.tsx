import { PageHeader } from "@/components/ui/page-header";
import { LinkForm } from "@/app/(dashboard)/links/link-form";

export default function NewLinkPage() {
  return (
    <>
      <PageHeader
        title="New link"
        description="Original URL required. Optional targeting, UTM, OG, and app routes."
      />
      <LinkForm mode="create" />
    </>
  );
}
