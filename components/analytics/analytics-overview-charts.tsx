"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
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
import {
  BarChart3,
  LineChart as LineChartIcon,
  Percent,
  PencilLine,
} from "lucide-react";

import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import {
  CountTooltip,
  CurrencyTooltip,
  PercentTooltip,
} from "@/components/analytics/analytics-chart-tooltips";
import { ChartCard } from "@/components/analytics/chart-card";
import {
  deriveGrossMarginTrend,
  hasCountSeries,
  hasValueSeries,
} from "@/lib/analytics/chart-helpers";
import type { AnalyticsData } from "@/lib/analytics/types";

type AnalyticsOverviewChartsProps = {
  charts: AnalyticsData["charts"];
};

export function AnalyticsOverviewCharts({ charts }: AnalyticsOverviewChartsProps) {
  const grossMarginTrend = useMemo(
    () => deriveGrossMarginTrend(charts.revenueTrend, charts.profitTrend),
    [charts.revenueTrend, charts.profitTrend]
  );

  const hasRevenue = hasValueSeries(charts.revenueTrend);
  const hasEstimates = hasCountSeries(charts.estimateVolumeTrend);
  const hasWinRate = hasValueSeries(charts.winRateTrend);
  const hasMarginTrend = hasValueSeries(grossMarginTrend);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Performance trends
        </h2>
        <p className="text-sm text-muted-foreground">
          Interactive charts for revenue, estimating volume, conversion, and
          margin over the selected period.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Revenue over time"
          description="Estimated selling price from finalized estimates."
          icon={LineChartIcon}
        >
          {hasRevenue ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueTrend}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
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
          title="Estimates created"
          description="New estimates added during the selected period."
          icon={PencilLine}
        >
          {hasEstimates ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.estimateVolumeTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CountTooltip suffix="estimates" />} />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState
              icon={PencilLine}
              title="No estimates in this period"
              description="Start building estimates to track production volume and team throughput."
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
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.winRateTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<PercentTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#f59e0b" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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

        <ChartCard
          title="Gross margin trends"
          description="Margin percentage derived from estimate profit and revenue."
          icon={Percent}
        >
          {hasMarginTrend ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={grossMarginTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<PercentTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState
              icon={Percent}
              title="No margin trends yet"
              description="Add cost and markup details to estimates to monitor gross margin performance."
              actionLabel="Review estimates"
              actionHref="/estimates"
            />
          )}
        </ChartCard>
      </div>
    </section>
  );
}
