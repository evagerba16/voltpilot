"use client";

import { CheckCircle2, BarChart3, TrendingDown, TrendingUp } from "lucide-react";

import { formatCurrency, formatPercent } from "@/lib/projects/format";
import type { JobPerformanceLesson } from "@/lib/projects/job-performance-lessons";
import type { ProjectBudgetSummary, ProjectKpiSummary } from "@/lib/projects/profile-types";
import { cn } from "@/lib/utils";

type JobPerformanceHandoffProps = {
  projectName: string;
  budget: ProjectBudgetSummary;
  kpis: ProjectKpiSummary;
  lessons: JobPerformanceLesson[];
};

export function JobPerformanceHandoff({
  projectName,
  budget,
  kpis,
  lessons,
}: JobPerformanceHandoffProps) {
  const overBudget = budget.variance > 0;
  const onTrack = Math.abs(budget.variancePercent) <= 5;

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.06] to-card shadow-sm">
      <div className="border-b border-primary/10 px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <BarChart3 className="size-3.5" />
              Job performance ready
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              How did {projectName} perform?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              You have enough actuals to compare this job against your bid. Review the numbers,
              capture what worked, and apply those lessons before pricing the next project.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:min-w-[240px]">
            <PerformanceStat
              label="Variance"
              value={formatCurrency(Math.abs(budget.variance))}
              sublabel={overBudget ? "Over estimate" : onTrack ? "On estimate" : "Under estimate"}
              tone={overBudget ? "danger" : onTrack ? "neutral" : "success"}
              icon={overBudget ? TrendingUp : TrendingDown}
            />
            <PerformanceStat
              label="Margin"
              value={
                kpis.grossMarginPercent > 0
                  ? formatPercent(kpis.grossMarginPercent)
                  : "—"
              }
              sublabel="Gross margin"
              tone={
                kpis.grossMarginPercent > 0 && kpis.grossMarginPercent < 10
                  ? "danger"
                  : "success"
              }
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-5 sm:px-8">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          Lessons for your next bid
        </h3>
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li
              key={lesson.id}
              className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/10 px-4 py-3 text-sm"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="leading-relaxed text-muted-foreground">{lesson.label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-muted-foreground">
          Use the primary action above to open analytics filtered to this project&apos;s estimate
          vs. actual costs.
        </p>
      </div>
    </section>
  );
}

function PerformanceStat({
  label,
  value,
  sublabel,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone?: "success" | "danger" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {Icon ? (
          <Icon
            className={cn(
              "size-4",
              tone === "danger" && "text-destructive",
              tone === "success" && "text-emerald-600 dark:text-emerald-400"
            )}
          />
        ) : null}
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
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}
