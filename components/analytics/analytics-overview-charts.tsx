"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  LineChart as LineChartIcon,
} from "lucide-react";

import { AnalyticsChartFrame } from "@/components/analytics/analytics-chart-frame";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import {
  CurrencyTooltip,
  PercentTooltip,
} from "@/components/analytics/analytics-chart-tooltips";
import { ChartCard } from "@/components/analytics/chart-card";
import {
  CHART_ANIMATION,
  CHART_AXIS,
  CHART_COLORS,
  CHART_GRID,
  CHART_MARGINS,
  chartGradientId,
} from "@/lib/analytics/chart-theme";
import { hasValueSeries } from "@/lib/analytics/chart-helpers";
import type { AnalyticsData } from "@/lib/analytics/types";

type AnalyticsOverviewChartsProps = {
  charts: AnalyticsData["charts"];
};

export function AnalyticsOverviewCharts({ charts }: AnalyticsOverviewChartsProps) {
  const hasRevenue = hasValueSeries(charts.revenueTrend);
  const hasWinRate = hasValueSeries(charts.winRateTrend);
  const revenueGradient = chartGradientId("revenue");

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Performance trends
        </h2>
        <p className="text-sm text-muted-foreground">
          Revenue and win rate over the selected period.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Revenue over time"
          description="Estimated selling price from finalized estimates."
          icon={LineChartIcon}
        >
          {hasRevenue ? (
            <AnalyticsChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueTrend} margin={CHART_MARGINS.default}>
                  <defs>
                    <linearGradient id={revenueGradient} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="label" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} width={48} />
                  <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: CHART_COLORS.revenue, strokeOpacity: 0.2 }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.revenue}
                    strokeWidth={2.5}
                    fill={`url(#${revenueGradient})`}
                    {...CHART_ANIMATION}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </AnalyticsChartFrame>
          ) : (
            <AnalyticsEmptyState
              icon={LineChartIcon}
              title="No revenue trend yet"
              description="Finalize estimates with selling prices to see revenue build over time."
              actionLabel="Create estimate"
              actionHref="/estimates"
            />
          )}
        </ChartCard>

        <ChartCard
          title="Proposal conversion rate"
          description="Win rate across decided proposals by period."
          icon={BarChart3}
        >
          {hasWinRate ? (
            <AnalyticsChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.winRateTrend} margin={CHART_MARGINS.default}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="label" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} width={40} />
                  <Tooltip content={<PercentTooltip />} cursor={{ stroke: CHART_COLORS.winRate, strokeOpacity: 0.2 }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.winRate}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: CHART_COLORS.winRate, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                    {...CHART_ANIMATION}
                  />
                </LineChart>
              </ResponsiveContainer>
            </AnalyticsChartFrame>
          ) : (
            <AnalyticsEmptyState
              icon={BarChart3}
              title="No conversion data yet"
              description="Send proposals and record acceptances to track your win rate over time."
              actionLabel="Create proposal"
              actionHref="/proposals"
            />
          )}
        </ChartCard>
      </div>
    </section>
  );
}
