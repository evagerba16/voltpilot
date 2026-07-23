"use client";

import {
  BarChart3,
  CircleDollarSign,
  FolderKanban,
  Percent,
  PencilLine,
  TrendingUp,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import type { AnalyticsData } from "@/lib/analytics/types";
import { isAnalyticsPortfolioEmpty } from "@/lib/analytics/chart-helpers";

type AnalyticsOverviewKpisProps = {
  executive: AnalyticsData["executive"];
};

export function AnalyticsOverviewKpis({ executive }: AnalyticsOverviewKpisProps) {
  const isEmpty = isAnalyticsPortfolioEmpty({ executive });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Key performance indicators for your electrical contracting business.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(executive.revenue)}
          change="Accepted proposals"
          changeType={executive.revenue > 0 ? "positive" : "neutral"}
          icon={CircleDollarSign}
        />
        <StatCard
          title="Total Estimates"
          value={String(executive.totalEstimates)}
          change={
            executive.totalEstimates > 0
              ? `${executive.averageEstimateSize > 0 ? formatCurrency(executive.averageEstimateSize) : "—"} avg size`
              : "No estimates yet"
          }
          icon={PencilLine}
        />
        <StatCard
          title="Proposal Win Rate"
          value={formatPercent(executive.winRate)}
          change={`${executive.totalProposals > 0 ? "Across sent proposals" : "Send proposals to track"}`}
          changeType={executive.winRate >= 40 ? "positive" : "neutral"}
          icon={BarChart3}
        />
        <StatCard
          title="Average Gross Margin"
          value={formatPercent(executive.grossMarginPercent)}
          change={`${formatCurrency(executive.grossProfit)} gross profit`}
          changeType={
            executive.grossMarginPercent >= 15 ? "positive" : "neutral"
          }
          icon={Percent}
        />
        <StatCard
          title="Active Projects"
          value={String(executive.activeProjects)}
          change="In progress pipeline"
          icon={FolderKanban}
        />
        <StatCard
          title="Estimated Pipeline Value"
          value={formatCurrency(executive.pipelineValue)}
          change="Open estimating & proposals"
          changeType={executive.pipelineValue > 0 ? "positive" : "neutral"}
          icon={TrendingUp}
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
