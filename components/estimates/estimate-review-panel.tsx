"use client";

import {
  AlertTriangle,
  CircleAlert,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  REVIEW_CATEGORY_LABELS,
  type EstimateReviewResult,
  type ReviewSuggestion,
  type ReviewSuggestionSeverity,
} from "@/lib/estimates/review";
import { cn } from "@/lib/utils";

type EstimateReviewPanelProps = {
  open: boolean;
  result: EstimateReviewResult | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onRefresh: () => void;
};

const severityStyles: Record<
  ReviewSuggestionSeverity,
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

function formatReviewTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sourceLabel(result: EstimateReviewResult | null) {
  if (!result?.source) {
    return null;
  }

  if (result.source === "hybrid") {
    return "Combined review";
  }

  if (result.source === "openai") {
    return "AI analysis";
  }

  return "Standard review";
}

function SuggestionCard({ suggestion }: { suggestion: ReviewSuggestion }) {
  const config = severityStyles[suggestion.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-4",
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            config.badge
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{suggestion.title}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                config.badge
              )}
            >
              {suggestion.severity}
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {REVIEW_CATEGORY_LABELS[suggestion.category]}
          </p>
          <p className="text-sm text-muted-foreground">
            {suggestion.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function EstimateReviewPanel({
  open,
  result,
  loading = false,
  error = null,
  onClose,
  onRefresh,
}: EstimateReviewPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close review panel"
      />

      <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold">AI estimate review</h2>
                <p className="text-sm text-muted-foreground">
                  Suggestions only. Your estimate is not changed.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-border px-5 py-4">
          <Button
            onClick={onRefresh}
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                Analyzing estimate...
              </>
            ) : (
              <>
                <Sparkles data-icon="inline-start" />
                Run review again
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading && !result ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Running AI estimate review...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {result ? (
            <>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-sm font-medium">{result.summary}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Reviewed {formatReviewTime(result.reviewedAt)}</span>
                  {sourceLabel(result) ? (
                    <>
                      <span>·</span>
                      <span>{sourceLabel(result)}</span>
                    </>
                  ) : null}
                </div>
              </div>

              {result.suggestions.length === 0 ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    No issues flagged
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The estimate passed checks. Still verify scope, allowances,
                    and exclusions before sending.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EstimateReviewButton({
  onClick,
  loading = false,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          Reviewing...
        </>
      ) : (
        <>
          <Sparkles data-icon="inline-start" />
          Review estimate
        </>
      )}
    </Button>
  );
}
