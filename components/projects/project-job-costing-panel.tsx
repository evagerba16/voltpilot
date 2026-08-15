"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Pencil, Save, X } from "lucide-react";

import { saveProjectJobCosting } from "@/app/(dashboard)/projects/job-costing-actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency, formatPercent } from "@/lib/projects/format";
import type { ProjectBudgetSummary, ProjectJobActuals } from "@/lib/projects/profile-types";
import { cn } from "@/lib/utils";

type ProjectJobCostingPanelProps = {
  projectId: string;
  budget: ProjectBudgetSummary;
  jobActuals: ProjectJobActuals | null;
  canEdit: boolean;
};

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProjectJobCostingPanel({
  projectId,
  budget,
  jobActuals,
  canEdit,
}: ProjectJobCostingPanelProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  const isOverBudget = budget.budgetUsedPercent > 100;

  const [values, setValues] = useState({
    actual_labor: jobActuals?.actual_labor ?? 0,
    actual_materials: jobActuals?.actual_materials ?? 0,
    actual_equipment: jobActuals?.actual_equipment ?? 0,
    actual_subcontractors: jobActuals?.actual_subcontractors ?? 0,
    actual_miscellaneous: jobActuals?.actual_miscellaneous ?? 0,
  });

  function handleEditToggle() {
    setError(null);
    setValues({
      actual_labor: jobActuals?.actual_labor ?? 0,
      actual_materials: jobActuals?.actual_materials ?? 0,
      actual_equipment: jobActuals?.actual_equipment ?? 0,
      actual_subcontractors: jobActuals?.actual_subcontractors ?? 0,
      actual_miscellaneous: jobActuals?.actual_miscellaneous ?? 0,
    });
    setEditing(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveProjectJobCosting(projectId, values);

      if (result.error) {
        setError(result.error);
        toastError(result.error);
        return;
      }

      success("Job costs saved.");
      setEditing(false);
    });
  }

  function updateValue(key: keyof typeof values, raw: string) {
    const parsed = Number(raw);
    setValues((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }));
  }

  return (
    <section
      id="job-costing"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="border-b border-border px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Job Costing</h2>
            <p className="text-sm text-muted-foreground">
              Track actual costs against estimate
              {budget.sourceEstimateTitle ? ` · ${budget.sourceEstimateTitle}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Budget used
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums transition-colors",
                  isOverBudget
                    ? "text-destructive"
                    : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {budget.budgetUsedPercent.toFixed(0)}%
              </p>
            </div>
            {canEdit && !editing ? (
              <Button variant="outline" size="sm" onClick={handleEditToggle}>
                <Pencil data-icon="inline-start" className="size-4" />
                Edit actuals
              </Button>
            ) : null}
            {editing ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                  <X data-icon="inline-start" className="size-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={pending}>
                  {pending ? (
                    <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
                  ) : (
                    <Save data-icon="inline-start" className="size-4" />
                  )}
                  Save
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="border-b border-border px-6 py-3">
          <AlertBanner variant="error">{error}</AlertBanner>
        </div>
      ) : null}

      <div className="grid gap-4 border-b border-border px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Estimated cost" value={formatCurrency(budget.estimatedTotal)} />
        <Metric
          label="Actual cost"
          value={budget.hasActuals || editing ? formatCurrency(budget.actualTotal) : "—"}
        />
        <Metric
          label="Variance"
          value={budget.hasActuals ? formatCurrency(budget.variance) : "—"}
          tone={budget.variance > 0 ? "danger" : "success"}
        />
        <Metric
          label="Remaining budget"
          value={formatCurrency(budget.remainingBudget)}
          tone={budget.remainingBudget <= 0 && budget.hasActuals ? "danger" : "default"}
        />
      </div>

      {!budget.hasActuals && !editing ? (
        <div className="px-6 py-5">
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Actual job costs haven&apos;t been recorded yet. Categories below reflect your
            estimate — click &ldquo;Edit actuals&rdquo; to enter field costs as work progresses.
          </p>
        </div>
      ) : null}

      <div className="divide-y divide-border/60">
        {budget.categories.map((category) => {
          const valueKey = `actual_${category.key}` as keyof typeof values;

          return (
            <div
              key={category.key}
              className={cn(
                "grid gap-3 px-6 py-4 transition-colors sm:grid-cols-[140px_1fr_auto]",
                category.isOverBudget && "bg-destructive/5"
              )}
            >
              <div className="flex items-center gap-2">
                {category.isOverBudget ? (
                  <AlertTriangle className="size-4 shrink-0 text-destructive" />
                ) : null}
                <p className="text-sm font-medium">{category.label}</p>
              </div>

              {editing ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Est. {formatCurrency(category.estimated)}</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClassName}
                    value={values[valueKey]}
                    onChange={(event) => updateValue(valueKey, event.target.value)}
                    aria-label={`Actual ${category.label}`}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Est. {formatCurrency(category.estimated)}</span>
                    <span>Act. {formatCurrency(category.actual)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
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
              )}

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
                  {category.isOverBudget ? "Over budget" : "Variance"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {budget.changeOrderCount > 0 ? (
        <div className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
          {budget.changeOrderCount} approved change order
          {budget.changeOrderCount === 1 ? "" : "s"} reflected in job costs.
        </div>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-emerald-700 dark:text-emerald-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}
