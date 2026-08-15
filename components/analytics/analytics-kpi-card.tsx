"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";

import type { MetricComparison } from "@/lib/analytics/comparison";
import { cn } from "@/lib/utils";

export type AnalyticsKpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  tooltip?: string;
  icon: LucideIcon;
  highlight?: boolean;
  comparison?: MetricComparison | null;
  compareEnabled?: boolean;
  index?: number;
};

export function AnalyticsKpiCard({
  title,
  value,
  subtitle,
  tooltip,
  icon: Icon,
  highlight = false,
  comparison,
  compareEnabled = false,
  index = 0,
}: AnalyticsKpiCardProps) {
  const showComparison = compareEnabled && comparison;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-md",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards",
        highlight
          ? "border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card"
          : "border-border bg-card hover:border-primary/20"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {highlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/10 blur-2xl transition-opacity motion-safe:duration-300 group-hover:opacity-80"
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {tooltip ? (
              <span className="relative">
                <Info
                  className="size-3.5 text-muted-foreground/70 transition-colors hover:text-foreground"
                  aria-label={tooltip}
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-normal normal-case leading-snug text-popover-foreground opacity-0 shadow-lg transition-opacity motion-safe:duration-200 group-hover:opacity-100"
                >
                  {tooltip}
                </span>
              </span>
            ) : null}
          </div>

          <p className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
            {value}
          </p>

          {showComparison ? (
            <ComparisonBadge comparison={comparison} />
          ) : subtitle ? (
            <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>
          ) : null}

          {showComparison && subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform motion-safe:duration-300 group-hover:scale-105",
            highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </article>
  );
}

function ComparisonBadge({ comparison }: { comparison: MetricComparison }) {
  const Icon =
    comparison.direction === "up"
      ? ArrowUpRight
      : comparison.direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        comparison.direction === "up"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : comparison.direction === "down"
            ? "bg-red-500/10 text-red-700 dark:text-red-400"
            : "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-3.5" />
      <span>
        {comparison.direction === "flat"
          ? "Flat"
          : `${Math.abs(comparison.changePercent).toFixed(0)}%`}
      </span>
      <span className="font-normal text-muted-foreground">{comparison.label}</span>
    </div>
  );
}
