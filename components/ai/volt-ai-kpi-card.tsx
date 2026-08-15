"use client";

import type { VoltAiPerformanceMetric } from "@/lib/ai/business-advisor";
import { voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { cn } from "@/lib/utils";

import { VoltAiCountUp } from "./volt-ai-count-up";

type VoltAiKpiCardProps = {
  metric: VoltAiPerformanceMetric;
  index?: number;
};

export function VoltAiKpiCard({ metric, index = 0 }: VoltAiKpiCardProps) {
  const showTrend = metric.trend && metric.trendPercent !== null;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all motion-safe:duration-300",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards",
        "hover:-translate-y-0.5 hover:shadow-md",
        voltAiAccent.border,
        voltAiAccent.borderHover
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 transition-opacity motion-safe:duration-300 group-hover:opacity-100"
      />

      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {metric.label}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
        {metric.numericValue != null ? (
          <VoltAiCountUp
            value={metric.numericValue}
            decimals={metric.suffix === "%" ? 0 : metric.suffix === " hrs" ? 1 : 0}
            suffix={metric.suffix ?? ""}
          />
        ) : (
          metric.value
        )}
      </p>

      {showTrend ? (
        <p
          className={cn(
            "mt-2 text-sm font-semibold",
            metric.trend === "up"
              ? "text-emerald-600 dark:text-emerald-400"
              : metric.trend === "down"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
          )}
        >
          {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}{" "}
          {metric.trendPercent!.toFixed(0)}%
        </p>
      ) : (
        <div className="mt-2 h-5 border-t border-border/60" aria-hidden="true" />
      )}
    </article>
  );
}
