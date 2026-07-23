"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { aiGetProjectInsights } from "@/app/(dashboard)/ai/actions";
import { ProjectInsightIcon } from "@/components/ai/proposal-assistant-panel";
import { Button } from "@/components/ui/button";
import type { ProjectInsightsResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type ProjectInsightsPanelProps = {
  projectId: string;
};

const CATEGORY_LABELS = {
  complexity: "Complexity",
  cost_risk: "Cost risk",
  profitability: "Profitability",
  pricing: "Pricing",
  action: "Action",
} as const;

export function ProjectInsightsPanel({ projectId }: ProjectInsightsPanelProps) {
  const [result, setResult] = useState<ProjectInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadInsights() {
    setError(null);

    startTransition(async () => {
      const response = await aiGetProjectInsights(projectId);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.result) {
        setResult(response.result);
      }
    });
  }

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI Project Insights</h2>
            <p className="text-sm text-muted-foreground">
              Complexity, risks, and profitability opportunities
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadInsights} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Refresh"
          )}
        </Button>
      </div>

      {pending && !result ? (
        <div className="flex items-center gap-2 px-6 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Analyzing project with AI...
        </div>
      ) : null}

      {error ? (
        <div className="px-6 py-6">
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="grid gap-4 border-b border-border px-6 py-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Complexity
              </p>
              <p className="text-lg font-semibold">{result.complexityLabel}</p>
              <p className="text-xs text-muted-foreground">
                Score {result.complexityScore}/10
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm">{result.summary}</p>
              {!result.aiEnabled ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Using standard recommendations. Full AI analysis will be available
                  when connected.
                </p>
              ) : null}
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {result.insights.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No issues flagged for this project.
              </p>
            ) : (
              result.insights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    "flex items-start gap-3 px-6 py-4",
                    insight.severity === "critical"
                      ? "bg-destructive/5"
                      : insight.severity === "warning"
                        ? "bg-amber-500/5"
                        : ""
                  )}
                >
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
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
