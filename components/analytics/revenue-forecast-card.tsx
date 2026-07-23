"use client";

import { LineChart, TrendingDown, TrendingUp } from "lucide-react";

import { ForecastMetric } from "@/components/analytics/forecast-metric";
import type { RevenueForecastResult } from "@/lib/analytics/forecast-service";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";

type RevenueForecastCardProps = {
  forecast: RevenueForecastResult;
};

export function RevenueForecastCard({ forecast }: RevenueForecastCardProps) {
  const rangeSpread =
    forecast.bestCaseRevenue > 0
      ? ((forecast.bestCaseRevenue - forecast.worstCaseRevenue) /
          forecast.bestCaseRevenue) *
        100
      : 0;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border px-6 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LineChart className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Revenue Forecast</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pipeline-weighted outlook from open estimates and proposal statuses.
          </p>
        </div>
        {forecast.source === "rules" ? (
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Standard recommendations
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2">
        <ForecastMetric
          label="Current Pipeline"
          value={formatCurrency(forecast.currentPipeline)}
          hint={`${forecast.itemCount} open estimate or proposal item${forecast.itemCount === 1 ? "" : "s"}`}
        />
        <ForecastMetric
          label="Expected Revenue"
          value={formatCurrency(forecast.expectedRevenue)}
          hint={`Blended with ${formatPercent(forecast.historicalWinRate)} historical win rate`}
          tone="positive"
        />
        <ForecastMetric
          label="Best Case Revenue"
          value={formatCurrency(forecast.bestCaseRevenue)}
          hint="Assumes full pipeline conversion"
        />
        <ForecastMetric
          label="Worst Case Revenue"
          value={formatCurrency(forecast.worstCaseRevenue)}
          hint="Conservative close rate on highest-confidence items"
          tone="warning"
        />
      </div>

      <div className="border-t border-border px-6 py-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="size-4 text-emerald-600" />
            Best − worst spread: {formatPercent(rangeSpread)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingDown className="size-4 text-amber-600" />
            {forecast.methodology}
          </span>
        </div>
      </div>
    </div>
  );
}
