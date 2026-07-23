"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsOverview } from "@/lib/core/schemas";

const tooltipStyle = {
  background: "#121820",
  border: "1px solid #243041",
  borderRadius: 6,
  color: "#e8eef4",
  fontSize: 12,
};

export function AnalyticsCharts({
  data,
  showTopLinks = true,
}: {
  data: AnalyticsOverview;
  showTopLinks?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Total clicks", data.totalClicks],
            ["Unique clicks", data.uniqueClicks],
            ["Countries", data.clicksByCountry.length],
            ["Top links", data.topLinks.length],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="border-b border-ink-line py-3 sm:border sm:border-ink-line sm:rounded-md sm:px-4"
          >
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink-fg">{value}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartBlock title="Clicks by date">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.clicksByDate}>
              <CartesianGrid stroke="#243041" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#8b9aab", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8b9aab", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#5eead4"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartBlock>

        <ChartBlock title="By device">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.clicksByDevice}>
              <CartesianGrid stroke="#243041" strokeDasharray="3 3" />
              <XAxis dataKey="device" tick={{ fill: "#8b9aab", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8b9aab", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="clicks" fill="#5eead4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>

        <ChartBlock title="By country">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.clicksByCountry.slice(0, 8)}>
              <CartesianGrid stroke="#243041" strokeDasharray="3 3" />
              <XAxis dataKey="countryCode" tick={{ fill: "#8b9aab", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8b9aab", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="clicks" fill="#99f6e4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>

        <ChartBlock title="By platform">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.clicksByPlatform}>
              <CartesianGrid stroke="#243041" strokeDasharray="3 3" />
              <XAxis dataKey="platform" tick={{ fill: "#8b9aab", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8b9aab", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="clicks" fill="#5eead4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>
      </section>

      {showTopLinks && data.topLinks.length > 0 ? (
        <section>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-signal">
            Top links
          </h3>
          <ul className="divide-y divide-ink-line">
            {data.topLinks.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <Link
                  href={`/links/${item.id}`}
                  className="font-mono text-signal hover:underline"
                >
                  {item.shortCode}
                </Link>
                <span className="text-ink-muted">{item.title || item.originalUrl}</span>
                <span className="font-mono text-ink-fg">
                  {item.totalClicks} / {item.uniqueClicks} uniq
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ChartBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
        {title}
      </h3>
      <div className="h-[220px] w-full">{children}</div>
    </div>
  );
}
