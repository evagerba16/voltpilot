"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CircleAlert,
  Info,
  Loader2,
} from "lucide-react";

import { CopilotSourceBadge } from "@/components/estimates/copilot/copilot-source-badge";
import { Button } from "@/components/ui/button";
import { isActionableRecommendation } from "@/lib/copilot/adapters/estimate-review-adapter";
import {
  formatConfidence,
  formatCopilotType,
  formatRecommendationStatus,
} from "@/lib/copilot/client/format-copilot-display";
import type {
  CopilotAddLineItemPayload,
  CopilotAdjustMarkupPayload,
  CopilotRecommendation,
  CopilotRecommendationSeverity,
} from "@/lib/copilot/types";
import { formatCurrency } from "@/lib/estimates/calculations";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<
  CopilotRecommendationSeverity,
  { icon: typeof Info; badge: string; border: string }
> = {
  critical: {
    icon: CircleAlert,
    badge: "bg-destructive/10 text-destructive",
    border: "border-destructive/30",
  },
  warning: {
    icon: AlertTriangle,
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  info: {
    icon: Info,
    badge: "bg-primary/10 text-primary",
    border: "border-border",
  },
};

type CopilotRecommendationCardProps = {
  recommendation: CopilotRecommendation;
  disabled?: boolean;
  busy?: boolean;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
};

function renderPayloadPreview(recommendation: CopilotRecommendation) {
  if (recommendation.recommendation_type === "add_line_item") {
    const payload = recommendation.payload as CopilotAddLineItemPayload;
    const unresolved = payload.unit_cost <= 0;

    return (
      <p className="text-xs text-muted-foreground">
        {payload.quantity} {payload.unit} ·{" "}
        {unresolved ?
          "Pricing needs review"
        : formatCurrency(payload.unit_cost)}
        {payload.unit !== "ea" ? ` / ${payload.unit}` : ""}
        {payload.org_catalog_item_id ? " · Company catalog" : null}
        {payload.catalog_item_id && !payload.org_catalog_item_id ?
          " · Default catalog"
        : null}
      </p>
    );
  }

  if (recommendation.recommendation_type === "adjust_markup") {
    const payload = recommendation.payload as CopilotAdjustMarkupPayload;

    if (payload.profit_margin_increase != null) {
      return (
        <p className="text-xs text-muted-foreground">
          Increase profit margin by +{payload.profit_margin_increase} points
        </p>
      );
    }
  }

  return null;
}

function canApplyRecommendation(recommendation: CopilotRecommendation) {
  return (
    isActionableRecommendation(recommendation) &&
    (recommendation.recommendation_type === "add_line_item" ||
      recommendation.recommendation_type === "update_line_item" ||
      recommendation.recommendation_type === "adjust_markup")
  );
}

export function CopilotRecommendationCard({
  recommendation,
  disabled = false,
  busy = false,
  onApply,
  onDismiss,
}: CopilotRecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const styles = SEVERITY_STYLES[recommendation.severity];
  const Icon = styles.icon;
  const actionable = canApplyRecommendation(recommendation);
  const isPending = recommendation.status === "pending";
  const evidence = recommendation.reasoning.evidence ?? [];

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm",
        styles.border,
        recommendation.status !== "pending" && "opacity-80"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles.badge)}>
              {recommendation.severity}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatCopilotType(recommendation.recommendation_type)}
            </span>
            <CopilotSourceBadge source={recommendation.reasoning.source} />
            <span className="text-xs text-muted-foreground">
              {formatConfidence(recommendation.reasoning.confidence)} confidence
            </span>
            {recommendation.status !== "pending" ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {formatRecommendationStatus(recommendation.status)}
              </span>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-semibold">{recommendation.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {recommendation.explanation}
            </p>
          </div>

          {renderPayloadPreview(recommendation)}

          {evidence.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Why this was suggested
                <ChevronDown
                  className={cn("size-3 transition-transform", expanded && "rotate-180")}
                />
              </button>
              {expanded ? (
                <ul className="mt-2 space-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {isPending ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {actionable ? (
                <Button
                  size="sm"
                  disabled={disabled || busy}
                  onClick={() => onApply(recommendation.id)}
                >
                  {busy ?
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  : null}
                  Apply
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || busy}
                onClick={() => onDismiss(recommendation.id)}
              >
                Dismiss
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
