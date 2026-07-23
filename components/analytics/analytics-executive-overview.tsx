"use client";

import Link from "next/link";
import {
  FileText,
  FolderKanban,
  PencilLine,
  Users,
} from "lucide-react";

import { AiOpportunitiesPanel } from "@/components/analytics/ai-opportunities-panel";
import { AnalyticsAiSummary } from "@/components/analytics/analytics-ai-summary";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsOverviewCharts } from "@/components/analytics/analytics-overview-charts";
import { AnalyticsOverviewKpis } from "@/components/analytics/analytics-overview-kpis";
import { ProfitForecastCard } from "@/components/analytics/profit-forecast-card";
import { RevenueForecastCard } from "@/components/analytics/revenue-forecast-card";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import type { PrecomputedAnalyticsViewModels } from "@/lib/analytics/precompute-view-models";
import type { AnalyticsData } from "@/lib/analytics/types";

type AnalyticsExecutiveOverviewProps = {
  data: AnalyticsData;
  precomputed: PrecomputedAnalyticsViewModels;
};

const ACTIVITY_ICONS = {
  customer: Users,
  project: FolderKanban,
  estimate: PencilLine,
  proposal: FileText,
} as const;

function DrillDownLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

function DataTable({
  headers,
  rows,
  emptyState,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyState: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="p-0">
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="hover:bg-muted/20">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsExecutiveOverview({
  data,
  precomputed,
}: AnalyticsExecutiveOverviewProps) {
  const { analytics, forecasts, aiInsights } = precomputed;

  return (
    <div className="space-y-8">
      <AnalyticsAiSummary
        data={data}
        analytics={analytics}
        aiInsights={aiInsights}
      />

      <AnalyticsOverviewKpis executive={data.executive} />

      <AnalyticsOverviewCharts charts={data.charts} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiOpportunitiesPanel opportunities={aiInsights.opportunities} />
        </div>
        <div className="space-y-6 xl:col-span-1">
          <RevenueForecastCard forecast={forecasts.revenue} />
          <ProfitForecastCard forecast={forecasts.profit} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-base font-semibold tracking-tight">
              Recent activity
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Latest updates across customers, projects, estimates, and
              proposals.
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {data.recentActivity.length === 0 ? (
              <AnalyticsEmptyState
                compact
                icon={Users}
                title="No activity in this period"
                description="Try expanding the date range or add customers, projects, and estimates to see a live activity feed."
                actionLabel="Go to dashboard"
                actionHref="/dashboard"
              />
            ) : (
              data.recentActivity.map((item) => {
                const Icon = ACTIVITY_ICONS[item.type];

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="truncate text-sm text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      <RelativeTime value={item.timestamp} />
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-base font-semibold tracking-tight">
              Recent estimates
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Drill down into the latest estimates in your portfolio.
            </p>
          </div>
          <DataTable
            headers={["Estimate", "Total", "Margin"]}
            rows={data.recentEstimates.map((estimate) => [
              <div key={estimate.id}>
                <DrillDownLink href={`/estimates/${estimate.id}`}>
                  {estimate.title}
                </DrillDownLink>
                <p className="text-xs text-muted-foreground">
                  {estimate.projectName}
                </p>
              </div>,
              <span key="total" className="font-medium tabular-nums">
                {formatCurrency(estimate.grandTotal)}
              </span>,
              formatPercent(estimate.profitMarginPercent),
            ])}
            emptyState={
              <AnalyticsEmptyState
                compact
                icon={PencilLine}
                title="No estimates in this period"
                description="Create estimates to track totals, margins, and production trends."
                actionLabel="Create estimate"
                actionHref="/estimates"
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
