"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import type { VoltAiKeyInsight } from "@/lib/ai/business-advisor";
import { voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { cn } from "@/lib/utils";

type VoltAiInsightCardProps = {
  insight: VoltAiKeyInsight;
  index?: number;
};

const toneStyles = {
  warning: "border-amber-500/20 bg-amber-500/5",
  success: "border-emerald-500/20 bg-emerald-500/5",
  info: "border-violet-500/20 bg-violet-500/5",
  opportunity: "border-indigo-500/20 bg-indigo-500/5",
} as const;

export function VoltAiInsightCard({ insight, index = 0 }: VoltAiInsightCardProps) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border p-5 shadow-sm transition-all motion-safe:duration-300",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards",
        "hover:-translate-y-0.5 hover:shadow-md",
        voltAiAccent.borderHover,
        toneStyles[insight.tone]
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold leading-snug">
          <span aria-hidden="true">{insight.emoji}</span>
          {insight.title}
        </h3>
        <p className="text-sm text-muted-foreground">{insight.subtitle}</p>
      </div>

      {insight.metricLabel && insight.metricValue ? (
        <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            {insight.metricLabel}
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight">
            {insight.metricValue}
          </p>
        </div>
      ) : null}

      <div className="mt-auto pt-1">
        <Link
          href={insight.href}
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-full sm:w-auto",
            voltAiAccent.button
          )}
        >
          {insight.actionLabel}
        </Link>
      </div>
    </article>
  );
}
