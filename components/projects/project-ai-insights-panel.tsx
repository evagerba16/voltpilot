"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ProjectInsightIcon } from "@/components/ai/proposal-assistant-panel";
import type { ProjectInsightWithAction } from "@/lib/projects/insights";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS = {
  complexity: "Complexity",
  cost_risk: "Cost risk",
  profitability: "Profitability",
  pricing: "Pricing",
  action: "Recommended action",
} as const;

type ProjectAiInsightsPanelProps = {
  insights: ProjectInsightWithAction[];
  summary: string;
  complexityLabel: string;
  complexityScore: number;
};

export function ProjectAiInsightsPanel({
  insights,
  summary,
  complexityLabel,
  complexityScore,
}: ProjectAiInsightsPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-violet-500/5 via-transparent to-transparent px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI Project Insights</h2>
            <p className="text-sm text-muted-foreground">
              Risk flags, budget alerts, and recommended next actions
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border px-6 py-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Complexity
          </p>
          <p className="text-lg font-semibold">{complexityLabel}</p>
          <p className="text-xs text-muted-foreground">Score {complexityScore}/10</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm">{summary}</p>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {insights.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No risks flagged — project looks on track.
          </p>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between",
                insight.severity === "critical"
                  ? "bg-destructive/5"
                  : insight.severity === "warning"
                    ? "bg-amber-500/5"
                    : ""
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <ProjectInsightIcon severity={insight.severity} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {CATEGORY_LABELS[insight.category]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
              </div>
              {insight.href && insight.actionLabel ? (
                <Link
                  href={insight.href}
                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                >
                  {insight.actionLabel} →
                </Link>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
