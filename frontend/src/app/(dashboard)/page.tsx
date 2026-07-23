import Link from "next/link";
import { CoreApiError, getCoreClient } from "@/lib/core";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsCharts } from "@/components/analytics-charts";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ days?: string }> };

export default async function OverviewPage({ searchParams }: Props) {
  const sp = await searchParams;
  const days = Math.min(Math.max(Number(sp.days) || 30, 1), 365);

  let error: string | null = null;
  let data = null;

  try {
    data = await getCoreClient().getAnalyticsOverview(days);
  } catch (err) {
    error =
      err instanceof CoreApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load analytics";
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description="Click analytics across operator-scoped links."
        actions={
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={`/?days=${d}`}>
                <Button variant={days === d ? "primary" : "secondary"} type="button">
                  {d}d
                </Button>
              </Link>
            ))}
          </div>
        }
      />

      {error ? <Alert title="Core error">{error}</Alert> : null}
      {data ? <AnalyticsCharts data={data} /> : null}
    </>
  );
}
