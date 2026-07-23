"use client";

import { Percent, TrendingDown } from "lucide-react";

import { ForecastMetric } from "@/components/analytics/forecast-metric";
import type { ProfitForecastResult } from "@/lib/analytics/forecast-service";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";

type ProfitForecastCardProps = {
  forecast: ProfitForecastResult;
};

export function ProfitForecastCard({ forecast }: ProfitForecastCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border px-6 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Percent className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Profit Forecast</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Margin-weighted profit outlook from the current pipeline.
          </p>
        </div>
        {forecast.source === "rules" ? (
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Standard recommendations
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 p-6">
        <ForecastMetric
          label="Expected Gross Profit"
          value={formatCurrency(forecast.expectedGrossProfit)}
          hint="Pipeline profit weighted by close probability"
          tone="positive"
        />
        <ForecastMetric
          label="Expected Gross Margin"
          value={formatPercent(forecast.expectedGrossMargin)}
          hint={`On expected revenue at ${formatPercent(forecast.targetMarginPercent)} target`}
        />
        <ForecastMetric
          label="Potential Profit Lost"
          value={formatCurrency(forecast.potentialProfitLost)}
          hint={
            forecast.lowMarginItemCount > 0
              ? `${forecast.lowMarginItemCount} low-margin estimate${forecast.lowMarginItemCount === 1 ? "" : "s"} below ${formatPercent(forecast.targetMarginPercent)}`
              : `No pipeline items below ${formatPercent(forecast.targetMarginPercent)} margin`
          }
          tone={forecast.potentialProfitLost > 0 ? "warning" : "muted"}
        />
      </div>

      <div className="border-t border-border px-6 py-4">
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <TrendingDown className="mt-0.5 size-4 shrink-0 text-amber-600" />
          {forecast.methodology}
        </p>
      </div>
    </div>
  );
}
