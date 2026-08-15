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
import type { VoltAiHistoricalTrends } from "@/lib/ai/business-advisor";
import { voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { cn } from "@/lib/utils";

type VoltAiHistoricalTrendsProps = {
  trends: VoltAiHistoricalTrends;
};

export function VoltAiHistoricalTrendsSection({ trends }: VoltAiHistoricalTrendsProps) {
  const grossMarginTrend = useMemo(
    () => deriveGrossMarginTrend(trends.revenueTrend, trends.profitTrend),
    [trends.revenueTrend, trends.profitTrend]
  );

  const hasRevenue = hasValueSeries(trends.revenueTrend);
  const hasProfit = hasValueSeries(trends.profitTrend);
  const hasEstimates = hasCountSeries(trends.estimateVolumeTrend);
  const hasWinRate = hasValueSeries(trends.winRateTrend);
  const hasMarginTrend = hasValueSeries(grossMarginTrend);

  return (
    <section className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Historical Trends</h2>
        <p className="text-sm text-muted-foreground">
          Revenue, profit, estimating volume, and win rate over the last 90 days.
        </p>
      </div>

      <div className={cn("grid gap-6 lg:grid-cols-2", voltAiAccent.border)}>
        <ChartCard
          title="Revenue"
          description="Accepted proposal revenue by period."
          icon={LineChartIcon}
        >
          {hasRevenue ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.revenueTrend}>
                  <defs>
                    <linearGradient id="voltAiRevenueGradient" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#voltAiRevenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState
              compact
              icon={LineChartIcon}
              title="No revenue history yet"
              description="Accepted proposals will populate this chart."
              actionLabel="View proposals"
              actionHref="/proposals"
            />
          )}
        </ChartCard>

        <ChartCard
          title="Gross profit"
          description="Profit from accepted work by period."
          icon={LineChartIcon}
        >
          {hasProfit ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.profitTrend}>
                  <defs>
                    <linearGradient id="voltAiProfitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#voltAiProfitGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState
              compact
              icon={LineChartIcon}
              title="No profit history yet"
              description="Finalize estimates with margins to track profit trends."
              actionLabel="Create estimate"
              actionHref="/estimates"
            />
          )}
        </ChartCard>

        <ChartCard
          title="Estimates created"
          description="New estimates added each period."
          icon={PencilLine}
        >
          {hasEstimates ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.estimateVolumeTrend}>
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
              compact
              icon={PencilLine}
              title="No estimate volume yet"
              description="Create estimates to see volume trends."
              actionLabel="Create estimate"
              actionHref="/estimates"
            />
          )}
        </ChartCard>

        <ChartCard
          title="Win rate"
          description="Proposal acceptance rate by period."
          icon={BarChart3}
        >
          {hasWinRate ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.winRateTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<PercentTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState
              compact
              icon={BarChart3}
              title="No win rate history yet"
              description="Send and decide on proposals to track conversion."
              actionLabel="Create proposal"
              actionHref="/proposals"
            />
          )}
        </ChartCard>
      </div>

      {hasMarginTrend ? (
        <ChartCard
          title="Gross margin trend"
          description="Derived margin percentage over time."
          icon={Percent}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={grossMarginTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip content={<PercentTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ) : null}
    </section>
  );
}
