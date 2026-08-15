/** @deprecated Superseded by ProjectJobCostingPanel — remove in a future cleanup PR. */
import { AlertTriangle } from "lucide-react";

import { formatCurrency, formatPercent } from "@/lib/projects/format";
import type { ProjectBudgetSummary } from "@/lib/projects/profile-types";
import { cn } from "@/lib/utils";

type ProjectBudgetPanelProps = {
  budget: ProjectBudgetSummary;
};

export function ProjectBudgetPanel({ budget }: ProjectBudgetPanelProps) {
  const isOverBudget = budget.budgetUsedPercent > 100;

  return (
    <section id="budget" className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Budget Tracking</h2>
            <p className="text-sm text-muted-foreground">
              Estimated vs actual costs
              {budget.sourceEstimateTitle ? ` · ${budget.sourceEstimateTitle}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Budget used
            </p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                isOverBudget
                  ? "text-destructive"
                  : "text-emerald-700 dark:text-emerald-400"
              )}
            >
              {budget.budgetUsedPercent.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border px-6 py-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Estimated
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {formatCurrency(budget.estimatedTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Actual
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {budget.hasActuals ? formatCurrency(budget.actualTotal) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Variance
          </p>
          <p
            className={cn(
              "text-lg font-semibold tabular-nums",
              budget.variance > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
            )}
          >
            {budget.hasActuals ? formatCurrency(budget.variance) : "—"}
          </p>
        </div>
      </div>

      {!budget.hasActuals ? (
        <div className="px-6 py-5">
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Actual job costs haven&apos;t been recorded yet. Budget categories below reflect
            your latest estimate — actuals will appear here once field costs are entered.
          </p>
        </div>
      ) : null}

      <div className="divide-y divide-border/60">
        {budget.categories.map((category) => (
          <div
            key={category.key}
            className={cn(
              "grid gap-3 px-6 py-4 sm:grid-cols-[140px_1fr_auto]",
              category.isOverBudget && "bg-destructive/5"
            )}
          >
            <div className="flex items-center gap-2">
              {category.isOverBudget ? (
                <AlertTriangle className="size-4 shrink-0 text-destructive" />
              ) : null}
              <p className="text-sm font-medium">{category.label}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Est. {formatCurrency(category.estimated)}</span>
                <span>Act. {formatCurrency(category.actual)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    category.isOverBudget ? "bg-destructive" : "bg-primary"
                  )}
                  style={{
                    width: `${Math.min(
                      100,
                      category.estimated > 0
                        ? (category.actual / category.estimated) * 100
                        : category.actual > 0
                          ? 100
                          : 0
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-right text-sm">
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  category.isOverBudget ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {category.estimated > 0 || category.actual > 0
                  ? formatPercent(Math.abs(category.variancePercent))
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {category.isOverBudget ? "Over" : "Variance"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {budget.changeOrderCount > 0 ? (
        <div className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
          {budget.changeOrderCount} change order{budget.changeOrderCount === 1 ? "" : "s"}{" "}
          recorded on this project.
        </div>
      ) : null}
    </section>
  );
}
