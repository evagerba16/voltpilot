"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";

import type { BusinessCoachInsightsResult } from "@/lib/analytics/ai-insights-service";
import { cn } from "@/lib/utils";

type AiBusinessCoachCardProps = {
  coach: BusinessCoachInsightsResult;
};

const severityStyles = {
  info: {
    card: "border-border bg-muted/20",
    badge: "bg-muted text-muted-foreground",
    icon: Info,
    iconClass: "text-muted-foreground",
  },
  warning: {
    card: "border-amber-500/30 bg-amber-500/5",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  success: {
    card: "border-emerald-500/30 bg-emerald-500/5",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
} as const;

export function AiBusinessCoachCard({ coach }: AiBusinessCoachCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI Business Coach</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Actionable insights from your analytics — recommendations only,
              nothing changes automatically.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
            {coach.insights.length} insight
            {coach.insights.length === 1 ? "" : "s"}
          </span>
          {coach.source === "rules" ? (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-400">
              Standard recommendations
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-b border-border px-6 py-4">
        <p className="text-sm">{coach.summary}</p>
      </div>

      <div className="divide-y divide-border/60">
        {coach.insights.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No insights for the current filters. Try expanding the date range or
            adding more project activity.
          </p>
        ) : (
          coach.insights.map((insight) => {
            const styles = severityStyles[insight.severity];
            const Icon = styles.icon;

            const content = (
              <div
                className={cn(
                  "flex gap-3 rounded-lg border p-4 transition-colors",
                  styles.card,
                  insight.href && "hover:bg-muted/30"
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", styles.iconClass)} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{insight.title}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        styles.badge
                      )}
                    >
                      {insight.severity}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {insight.explanation}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Recommended action: </span>
                    {insight.recommendedAction}
                  </p>
                </div>
              </div>
            );

            return (
              <div key={insight.id} className="px-6 py-4">
                {insight.href ? (
                  <Link href={insight.href} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
