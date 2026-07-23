"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleAlert,
  ClipboardCheck,
  Info,
  Loader2,
  PackagePlus,
  Percent,
  RefreshCw,
  TrendingUp,
  UserRoundCheck,
  Wrench,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  type AiReviewActionType,
  type AiReviewHealth,
  type AiReviewHealthStatus,
  type AiReviewRecommendation,
  type AiReviewResult,
  type AiReviewSection,
  type AiReviewSeverity,
} from "@/lib/ai/ai-review-service";
import { cn } from "@/lib/utils";

type AIReviewPanelProps = {
  open: boolean;
  result: AiReviewResult | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onAddMaterial: (recommendation: AiReviewRecommendation) => void;
  onUpdateLabor: (recommendation: AiReviewRecommendation) => void;
  onUpdateUnit: (recommendation: AiReviewRecommendation) => void;
  onIncreaseMarkup: (recommendation: AiReviewRecommendation) => void;
};

const severityStyles: Record<
  AiReviewSeverity,
  { icon: typeof Info; badge: string; border: string; label: string }
> = {
  critical: {
    icon: CircleAlert,
    badge: "bg-destructive/10 text-destructive",
    border: "border-destructive/30",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
    label: "Warning",
  },
  info: {
    icon: Info,
    badge: "bg-primary/10 text-primary",
    border: "border-border",
    label: "Info",
  },
};

const ACTION_LABELS: Record<Exclude<AiReviewActionType, "ignore">, string> = {
  add_material: "Add material",
  update_labor: "Update labor",
  update_unit: "Update unit",
  increase_markup: "Increase markup",
};

const HEALTH_STATUS_STYLES: Record<
  AiReviewHealthStatus,
  { badge: string; border: string; label: string }
> = {
  ready: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    label: "Ready to send",
  },
  review_required: {
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
    label: "Review recommended",
  },
  not_ready: {
    badge: "bg-destructive/10 text-destructive",
    border: "border-destructive/30",
    label: "Not ready",
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

function sourceLabel(result: AiReviewResult | null) {
  if (!result) {
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

function HealthSection({ health }: { health: AiReviewHealth }) {
  const config = HEALTH_STATUS_STYLES[health.status];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden>
          ✅
        </span>
        <h3 className="text-sm font-semibold">Overall Estimate Health</h3>
      </div>

      <div className={cn("rounded-lg border bg-background p-4", config.border)}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{health.headline}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                  config.badge
                )}
              >
                {config.label}
              </span>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {health.highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0 text-center">
            <p className="text-2xl font-bold tabular-nums">{health.score}</p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Health score
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecommendationCard({
  recommendation,
  ignored,
  onAddMaterial,
  onUpdateLabor,
  onUpdateUnit,
  onIncreaseMarkup,
  onIgnore,
}: {
  recommendation: AiReviewRecommendation;
  ignored: boolean;
  onAddMaterial: (recommendation: AiReviewRecommendation) => void;
  onUpdateLabor: (recommendation: AiReviewRecommendation) => void;
  onUpdateUnit: (recommendation: AiReviewRecommendation) => void;
  onIncreaseMarkup: (recommendation: AiReviewRecommendation) => void;
  onIgnore: (recommendationId: string) => void;
}) {
  const config = severityStyles[recommendation.severity];
  const Icon = config.icon;

  const primaryActions = recommendation.actions.filter(
    (action) => action !== "ignore"
  );

  function handleAction(action: AiReviewActionType) {
    switch (action) {
      case "add_material":
        onAddMaterial(recommendation);
        break;
      case "update_labor":
        onUpdateLabor(recommendation);
        break;
      case "update_unit":
        onUpdateUnit(recommendation);
        break;
      case "increase_markup":
        onIncreaseMarkup(recommendation);
        break;
      case "ignore":
        onIgnore(recommendation.id);
        break;
    }
  }

  function actionIcon(action: Exclude<AiReviewActionType, "ignore">) {
    switch (action) {
      case "add_material":
        return <PackagePlus data-icon="inline-start" />;
      case "update_labor":
        return <Wrench data-icon="inline-start" />;
      case "update_unit":
        return <TrendingUp data-icon="inline-start" />;
      case "increase_markup":
        return <Percent data-icon="inline-start" />;
    }
  }

  if (ignored) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 opacity-60">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground line-through">
            {recommendation.title}
          </p>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ignored
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-4 shadow-sm",
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

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{recommendation.title}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                  config.badge
                )}
              >
                {config.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {recommendation.explanation}
            </p>
          </div>

          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reasoning
            </p>
            <p className="mt-1 text-sm">{recommendation.reasoning}</p>
          </div>

          <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recommended action
            </p>
            <p className="mt-1 text-sm">{recommendation.recommendedAction}</p>
          </div>

          {recommendation.suggestedLineItem ? (
            <p className="text-xs text-muted-foreground">
              Suggested line: {recommendation.suggestedLineItem.description} (
              {recommendation.suggestedLineItem.quantity}{" "}
              {recommendation.suggestedLineItem.unit})
            </p>
          ) : null}

          {recommendation.suggestedUnitCost !== undefined ? (
            <p className="text-xs text-muted-foreground">
              Suggested unit cost: ${recommendation.suggestedUnitCost.toFixed(2)}
            </p>
          ) : null}

          {recommendation.suggestedMarkupIncrease !== undefined ? (
            <p className="text-xs text-muted-foreground">
              Suggested markup increase: +{recommendation.suggestedMarkupIncrease}%
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {primaryActions.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={
                  action === "add_material" || action === "update_labor" ?
                    "default"
                  : "outline"
                }
                onClick={() => handleAction(action)}
              >
                {actionIcon(action)}
                {ACTION_LABELS[action]}
              </Button>
            ))}
            {recommendation.actions.includes("ignore") ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onIgnore(recommendation.id)}
              >
                Ignore recommendation
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewSectionBlock({
  section,
  ignoredIds,
  onAddMaterial,
  onUpdateLabor,
  onUpdateUnit,
  onIncreaseMarkup,
  onIgnore,
}: {
  section: AiReviewSection;
  ignoredIds: Set<string>;
  onAddMaterial: (recommendation: AiReviewRecommendation) => void;
  onUpdateLabor: (recommendation: AiReviewRecommendation) => void;
  onUpdateUnit: (recommendation: AiReviewRecommendation) => void;
  onIncreaseMarkup: (recommendation: AiReviewRecommendation) => void;
  onIgnore: (recommendationId: string) => void;
}) {
  const activeItems = section.recommendations.filter(
    (item) => !ignoredIds.has(item.id)
  );
  const ignoredItems = section.recommendations.filter((item) =>
    ignoredIds.has(item.id)
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>
            {section.emoji}
          </span>
          <h3 className="text-sm font-semibold">{section.label}</h3>
        </div>
        {activeItems.length > 0 ? (
          <span className="text-xs font-medium text-muted-foreground">
            {activeItems.length} finding{activeItems.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {activeItems.length === 0 && ignoredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          {section.emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {section.recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              ignored={ignoredIds.has(recommendation.id)}
              onAddMaterial={onAddMaterial}
              onUpdateLabor={onUpdateLabor}
              onUpdateUnit={onUpdateUnit}
              onIncreaseMarkup={onIncreaseMarkup}
              onIgnore={onIgnore}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function AIReviewPanel({
  open,
  result,
  loading = false,
  error = null,
  onClose,
  onRefresh,
  onAddMaterial,
  onUpdateLabor,
  onUpdateUnit,
  onIncreaseMarkup,
}: AIReviewPanelProps) {
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());

  const sections = useMemo(() => result?.sections ?? [], [result]);

  function handleIgnore(recommendationId: string) {
    setIgnoredIds((current) => new Set([...current, recommendationId]));
  }

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

      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRoundCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Senior estimator review</h2>
              <p className="text-sm text-muted-foreground">
                Full estimate review before this bid goes to the customer.
              </p>
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
                Reviewing estimate...
              </>
            ) : (
              <>
                <RefreshCw data-icon="inline-start" />
                Run review again
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {loading && !result ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Senior estimator is reviewing materials, labor, pricing, and scope...
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
                <div className="flex items-start gap-2">
                  <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
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
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-destructive">
                    {result.stats.critical}
                  </p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Critical
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                    {result.stats.warning}
                  </p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Warning
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-center">
                  <p className="text-lg font-semibold">{result.stats.info}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Info
                  </p>
                </div>
              </div>

              <HealthSection health={result.health} />

              {sections.map((section) => (
                <ReviewSectionBlock
                  key={section.id}
                  section={section}
                  ignoredIds={ignoredIds}
                  onAddMaterial={onAddMaterial}
                  onUpdateLabor={onUpdateLabor}
                  onUpdateUnit={onUpdateUnit}
                  onIncreaseMarkup={onIncreaseMarkup}
                  onIgnore={handleIgnore}
                />
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AiReviewButton({
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
          <UserRoundCheck data-icon="inline-start" />
          Review estimate
        </>
      )}
    </Button>
  );
}
