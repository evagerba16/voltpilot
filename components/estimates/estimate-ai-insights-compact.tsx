"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IntelligenceSectionHeader } from "@/components/ui/intelligence-section-header";
import {
  buildEstimateReviewInsights,
  type EstimateReviewInsight,
  type EstimateReviewInsightKind,
} from "@/lib/ai/estimate-review-insights";
import type { EstimateReviewContext } from "@/lib/ai/types";
import type { EstimateBuilderState } from "@/lib/estimates/types";
import { vpTheme } from "@/lib/ui/vp-theme";
import { cn } from "@/lib/utils";

const MAX_INSIGHTS = 3;

const kindToCategory: Record<EstimateReviewInsightKind, string> = {
  warning: "Needs attention",
  opportunity: "Opportunity",
  success: "Informational",
  info: "Informational",
};

const kindStyles: Record<EstimateReviewInsightKind, string> = {
  warning: vpTheme.insightRowAttention,
  opportunity: vpTheme.insightRowOpportunity,
  success: vpTheme.insightRowInfo,
  info: vpTheme.insightRowInfo,
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
        variant="default"
        className="shrink-0 rounded-full"
        onClick={() => onApplyMarkup(markupAction.targetPercent)}
      >
        Apply {markupAction.targetPercent.toFixed(0)}% markup
      </Button>
    );
  }

  if (insight.action?.type === "open_full_review") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 rounded-full"
        onClick={onOpenFullReview}
      >
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
    <section className="space-y-4">
      <IntelligenceSectionHeader
        title="Estimate checks"
        description="Actionable recommendations for pricing, scope, and markup on this estimate."
        action={
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
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
        }
      />

      <div className={vpTheme.intelligenceSurface}>
        <ul className="divide-y divide-border/60">
          {items.map((insight) => (
            <li
              key={insight.id}
              className={cn("border-l-2 px-5 py-4", kindStyles[insight.kind])}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand">
                    {kindToCategory[insight.kind]}
                  </span>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{insight.message}</p>
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
