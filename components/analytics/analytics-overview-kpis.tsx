"use client";

import {
  BarChart3,
  CircleDollarSign,
  Percent,
} from "lucide-react";

import { AnalyticsKpiCard } from "@/components/analytics/analytics-kpi-card";
import type { AnalyticsComparisons } from "@/lib/analytics/comparison";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import type { AnalyticsData } from "@/lib/analytics/types";
import { isAnalyticsPortfolioEmpty } from "@/lib/analytics/chart-helpers";

type AnalyticsOverviewKpisProps = {
  executive: AnalyticsData["executive"];
  comparisons: AnalyticsComparisons["executive"];
  compareEnabled: boolean;
};

export function AnalyticsOverviewKpis({
  executive,
  comparisons,
  compareEnabled,
}: AnalyticsOverviewKpisProps) {
  const isEmpty = isAnalyticsPortfolioEmpty({ executive });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Key performance indicators for your electrical contracting business.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnalyticsKpiCard
          index={0}
          title="Total Revenue"
          value={formatCurrency(executive.revenue)}
          subtitle="Accepted proposals"
          tooltip="Total revenue from accepted proposals in the selected period."
          icon={CircleDollarSign}
          highlight
          comparison={comparisons.revenue}
          compareEnabled={compareEnabled}
        />
        <AnalyticsKpiCard
          index={1}
          title="Proposal Win Rate"
          value={formatPercent(executive.winRate)}
          subtitle={
            executive.totalProposals > 0
              ? "Across sent proposals"
              : "Send proposals to track"
          }
          tooltip="Percentage of decided proposals that were accepted."
          icon={BarChart3}
          comparison={comparisons.winRate}
          compareEnabled={compareEnabled}
        />
        <AnalyticsKpiCard
          index={2}
          title="Average Gross Margin"
          value={formatPercent(executive.grossMarginPercent)}
          subtitle={`${formatCurrency(executive.grossProfit)} gross profit`}
          tooltip="Gross profit divided by revenue across finalized estimates."
          icon={Percent}
          comparison={comparisons.grossMarginPercent}
          compareEnabled={compareEnabled}
        />
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground">
          Create your first estimate and send a proposal to populate these
          metrics automatically.
        </p>
      ) : null}
    </section>
  );
}
