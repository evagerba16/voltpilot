"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calculator,
  CircleAlert,
  Info,
  Sparkles,
} from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button-variants";
import type { DashboardInsightsData } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type AiInsightsPanelProps = {
  data: DashboardInsightsData;
};

const TYPE_LABELS = {
  review_required: "Review required",
  low_margin: "Low margin",
  missing_info: "Missing info",
  high_risk: "High risk",
  recommended_action: "Recommended",
} as const;

const severityStyles = {
  critical: "border-destructive/30 bg-destructive/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  info: "border-border bg-muted/20",
};

export function AiInsightsPanel({ data }: AiInsightsPanelProps) {
  const primaryHref =
    data.items.length > 0 ? data.items[0].href : "/estimates";
  const primaryLabel =
    data.items.length > 0 ? "Review AI recommendations" : "Create your first estimate";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI Insights</h2>
              <p className="text-sm text-muted-foreground">
                Recommendations across your estimating portfolio
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
            {data.counts.reviewRequired} review
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
            {data.counts.lowMargin} low margin
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
            {data.counts.highRisk} high risk
          </span>
          {!data.aiEnabled ? (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-400">
              Standard recommendations
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-b border-border px-6 py-4">
        <p className="text-sm">{data.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          AI provides recommendations only — nothing is changed without your approval.
        </p>
      </div>

      <div className="divide-y divide-border/60">
        {data.items.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title="No AI insights yet"
            description="Create your first estimate to unlock AI review, margin checks, and portfolio recommendations."
            action={
              <Link href="/estimates" className={buttonVariants()}>
                Create your first estimate
              </Link>
            }
            className="py-10"
          />
        ) : (
          data.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/20",
                severityStyles[item.severity]
              )}
            >
              <div className="mt-0.5 shrink-0">
                {item.severity === "critical" ? (
                  <CircleAlert className="size-4 text-destructive" />
                ) : item.severity === "warning" ? (
                  <AlertTriangle className="size-4 text-amber-600" />
                ) : (
                  <Info className="size-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABELS[item.type]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.entityLabel}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href={primaryHref} className={cn(buttonVariants(), "w-full sm:w-auto")}>
          {primaryLabel}
        </Link>
        <Link
          href="/ai"
          className="text-center text-sm font-medium text-primary hover:underline sm:text-left"
        >
          Open AI Assistant →
        </Link>
      </div>
    </div>
  );
}
