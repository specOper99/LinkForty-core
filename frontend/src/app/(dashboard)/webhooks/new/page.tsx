import { PageHeader } from "@/components/ui/page-header";
import { WebhookForm } from "@/app/(dashboard)/webhooks/webhook-form";

export default function NewWebhookPage() {
  return (
    <>
      <PageHeader
        title="New webhook"
        description="Choose events and delivery URL. Signing secret shown once."
      />
      <WebhookForm mode="create" />
    </>
  );
}
