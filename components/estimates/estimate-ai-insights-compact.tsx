"use client";

import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildEstimateReviewInsights,
  type EstimateReviewInsight,
  type EstimateReviewInsightKind,
} from "@/lib/ai/estimate-review-insights";
import type { EstimateReviewContext } from "@/lib/ai/types";
import type { EstimateBuilderState } from "@/lib/estimates/types";
import { cn } from "@/lib/utils";

const MAX_INSIGHTS = 3;

const kindToCategory: Record<EstimateReviewInsightKind, string> = {
  warning: "Needs attention",
  opportunity: "Opportunity",
  success: "Informational",
  info: "Informational",
};

const kindStyles: Record<EstimateReviewInsightKind, string> = {
  warning: "border-l-amber-500/40 bg-amber-500/[0.03]",
  opportunity: "border-l-violet-500/40 bg-violet-500/[0.03]",
  success: "border-l-border bg-muted/10",
  info: "border-l-border bg-muted/10",
};

type EstimateAiInsightsCompactProps = {
  state: EstimateBuilderState;
  context: EstimateReviewContext;
  loading?: boolean;
  disabled?: boolean;
  onOpenFullReview: () => void;
  onApplyMarkup: (targetPercent: number) => void;
};

function InsightAction({
  insight,
  disabled,
  onOpenFullReview,
  onApplyMarkup,
}: {
  insight: EstimateReviewInsight;
  disabled?: boolean;
  onOpenFullReview: () => void;
  onApplyMarkup: (targetPercent: number) => void;
}) {
  const markupAction =
    insight.action?.type === "increase_markup" ? insight.action : null;

  if (markupAction && !disabled) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => onApplyMarkup(markupAction.targetPercent)}
      >
        Apply {markupAction.targetPercent.toFixed(0)}% markup
      </Button>
    );
  }

  if (insight.action?.type === "open_full_review") {
    return (
      <Button size="sm" variant="ghost" className="shrink-0" onClick={onOpenFullReview}>
        Review details
      </Button>
    );
  }

  return null;
}

export function EstimateAiInsightsCompact({
  state,
  context,
  loading = false,
  disabled = false,
  onOpenFullReview,
  onApplyMarkup,
}: EstimateAiInsightsCompactProps) {
  const { insights, hasActiveLineItems } = buildEstimateReviewInsights(state, context);
  const items = insights.slice(0, MAX_INSIGHTS);

  if (!hasActiveLineItems || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">Quick checks</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenFullReview}
          disabled={loading || disabled}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              Reviewing...
            </>
          ) : (
            "Full review"
          )}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <ul className="divide-y divide-border/60">
          {items.map((insight) => (
            <li
              key={insight.id}
              className={cn("border-l-2 px-5 py-3.5", kindStyles[insight.kind])}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    {kindToCategory[insight.kind]}
                  </span>
                  <p className="mt-1.5 text-sm leading-relaxed">{insight.message}</p>
                </div>
                <InsightAction
                  insight={insight}
                  disabled={disabled}
                  onOpenFullReview={onOpenFullReview}
                  onApplyMarkup={onApplyMarkup}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
