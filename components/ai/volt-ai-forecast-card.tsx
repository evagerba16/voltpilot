"use client";

import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";

import type { VoltAiForecastTile } from "@/lib/ai/business-advisor";
import { voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { cn } from "@/lib/utils";

import { VoltAiCountUp } from "./volt-ai-count-up";

type VoltAiForecastCardProps = {
  tile: VoltAiForecastTile;
  index?: number;
};

function ChangeBadge({
  direction,
  changePercent,
}: {
  direction: NonNullable<VoltAiForecastTile["changeDirection"]>;
  changePercent: number;
}) {
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        direction === "up"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : direction === "down"
            ? "bg-red-500/10 text-red-700 dark:text-red-400"
            : "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-3.5" />
      {direction === "flat" ? "Flat" : `${changePercent.toFixed(1)}%`}
    </span>
  );
}

export function VoltAiForecastCard({ tile, index = 0 }: VoltAiForecastCardProps) {
  const showChange =
    tile.changeDirection && tile.changePercent !== null && tile.changePercent > 0;

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
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-0 blur-2xl transition-opacity motion-safe:duration-300 group-hover:opacity-100",
          voltAiAccent.gradientSoft
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className={cn("size-4", voltAiAccent.icon)} />
            {tile.title}
          </div>

          <p className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
            {tile.numericValue != null && tile.id !== "pipeline-health" ? (
              <VoltAiCountUp
                value={tile.numericValue}
                decimals={tile.numericValue >= 1000 ? 0 : 1}
                prefix={tile.value.startsWith("$") ? "$" : ""}
              />
            ) : (
              tile.value
            )}
          </p>

          {showChange ? (
            <ChangeBadge
              direction={tile.changeDirection!}
              changePercent={tile.changePercent!}
            />
          ) : null}

          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600/80 dark:text-violet-400/80">
            {tile.periodLabel}
          </p>

          <p className="text-xs text-muted-foreground">{tile.hint}</p>
        </div>
      </div>
    </article>
  );
}
