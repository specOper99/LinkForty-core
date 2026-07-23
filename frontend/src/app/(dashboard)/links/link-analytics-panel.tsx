import { CoreApiError, getCoreClient } from "@/lib/core";
import { Alert } from "@/components/ui/alert";
import { AnalyticsCharts } from "@/components/analytics-charts";

export async function LinkAnalyticsPanel({
  linkId,
  days = 30,
}: {
  linkId: string;
  days?: number;
}) {
  try {
    const data = await getCoreClient().getLinkAnalytics(linkId, days);
    return (
      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Link analytics ({days}d)
        </h2>
        <AnalyticsCharts data={data} showTopLinks={false} />
      </section>
    );
  } catch (err) {
    return (
      <Alert tone="muted" title="Analytics unavailable">
        {err instanceof CoreApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load analytics"}
      </Alert>
    );
  }
}
