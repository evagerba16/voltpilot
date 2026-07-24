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

type AiEstimateReviewCardProps = {
  state: EstimateBuilderState;
  context: EstimateReviewContext;
  loading?: boolean;
  disabled?: boolean;
  onOpenFullReview: () => void;
  onApplyMarkup: (targetPercent: number) => void;
};

const KIND_EMOJI: Record<EstimateReviewInsightKind, string> = {
  warning: "⚠️",
  opportunity: "💰",
  success: "✓",
  info: "ℹ️",
};

const KIND_STYLES: Record<EstimateReviewInsightKind, string> = {
  warning: "text-amber-800 dark:text-amber-300",
  opportunity: "text-emerald-700 dark:text-emerald-400",
  success: "text-emerald-700 dark:text-emerald-400",
  info: "text-muted-foreground",
};

function InsightRow({
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
  const emoji =
    insight.kind === "success" ? "✓" : KIND_EMOJI[insight.kind];
  const markupAction =
    insight.action?.type === "increase_markup" ? insight.action : null;

  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <p className={cn("text-sm leading-relaxed", KIND_STYLES[insight.kind])}>
        <span className="mr-2" aria-hidden>
          {emoji}
        </span>
        {insight.message}
      </p>

      {markupAction && !disabled ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => onApplyMarkup(markupAction.targetPercent)}
        >
          Apply {markupAction.targetPercent.toFixed(0)}% markup
        </Button>
      ) : null}

      {insight.action?.type === "open_full_review" ? (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={onOpenFullReview}
        >
          Review details
        </Button>
      ) : null}
    </li>
  );
}

export function AiEstimateReviewCard({
  state,
  context,
  loading = false,
  disabled = false,
  onOpenFullReview,
  onApplyMarkup,
}: AiEstimateReviewCardProps) {
  const { insights, hasActiveLineItems } = buildEstimateReviewInsights(
    state,
    context
  );

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI Estimate Review</h2>
            <p className="text-sm text-muted-foreground">
              Instant checks against similar electrical projects
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenFullReview}
          disabled={loading || !hasActiveLineItems}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              Reviewing...
            </>
          ) : (
            "View full review"
          )}
        </Button>
      </div>

      <div className="px-5 py-4">
        {!hasActiveLineItems ? (
          <p className="text-sm text-muted-foreground">
            Add line items or insert an assembly to see AI estimate review insights.
          </p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            <span className="mr-2" aria-hidden>
              ✓
            </span>
            No major issues flagged — materials, labor, and margin look reasonable
            for this scope.
          </p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight) => (
              <InsightRow
                key={insight.id}
                insight={insight}
                disabled={disabled}
                onOpenFullReview={onOpenFullReview}
                onApplyMarkup={onApplyMarkup}
              />
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Recommendations only — nothing changes until you apply an action or run
          the full senior estimator review.
        </p>
      </div>
    </section>
  );
}
