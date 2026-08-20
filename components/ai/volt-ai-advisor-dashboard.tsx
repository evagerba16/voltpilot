"use client";

import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { AiCopilotPanel } from "@/components/ai/ai-copilot-panel";
import { askVoltAi } from "@/app/(dashboard)/ai/actions";
import { VoltAiActionRow } from "@/components/ai/volt-ai-action-row";
import { VoltAiAskPanel } from "@/components/ai/volt-ai-ask-panel";
import { VoltAiBusinessHealthCard } from "@/components/ai/volt-ai-business-health";
import { VoltAiForecastCard } from "@/components/ai/volt-ai-forecast-card";
import { VoltAiHistoricalTrendsSection } from "@/components/ai/volt-ai-historical-trends";
import { VoltAiInsightCard } from "@/components/ai/volt-ai-insight-card";
import { VoltAiKpiCard } from "@/components/ai/volt-ai-kpi-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import type { VoltAiAdvisorViewModel } from "@/lib/ai/business-advisor";
import type { CopilotSuggestion } from "@/lib/ai/proactive-copilot";
import { voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { VP_INTELLIGENCE_LABEL, vpTheme } from "@/lib/ui/vp-theme";
import { cn } from "@/lib/utils";

type VoltAiAdvisorDashboardProps = {
  data: VoltAiAdvisorViewModel;
  copilotSuggestions?: CopilotSuggestion[];
};

function SectionHeading({
  emoji,
  title,
  badge,
}: {
  emoji?: string;
  title: string;
  badge?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3"
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        {emoji ? <span aria-hidden="true">{emoji}</span> : null}
        {title}
      </h2>
      {badge ? (
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function VoltAiAdvisorDashboard({
  data,
  copilotSuggestions = [],
}: VoltAiAdvisorDashboardProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const highPriority = data.recommendedActions.filter(
    (action) => action.priority === "high"
  );
  const mediumPriority = data.recommendedActions.filter(
    (action) => action.priority === "medium"
  );

  function submitQuestion(prompt?: string) {
    const value = (prompt ?? question).trim();
    if (!value) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await askVoltAi(value);
      if (response.error) {
        setError(response.error);
        setAnswer(null);
        return;
      }

      setAnswer(response.answer ?? null);
      if (prompt) {
        setQuestion(prompt);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Header + Business Health */}
      <section className="vp-surface-hero vp-blueprint-grid rounded-xl">
        <div className="relative border-b border-border/70 px-6 py-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand/10 ring-1 ring-brand/20">
                <Bot className="size-6 text-brand" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className={vpTheme.intelligenceBadge}>
                    <Sparkles className="size-3" aria-hidden="true" />
                    {VP_INTELLIGENCE_LABEL}
                  </p>
                  <span className="rounded-full border border-border/80 bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Business advisor
                  </span>
                </div>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                  Command Center
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Actionable insights across your pipeline, forecasts, and portfolio health.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Last updated{" "}
                  <RelativeTime value={data.generatedAt} className="text-muted-foreground" />
                </p>
              </div>
            </div>

            <div className="w-full xl:max-w-md">
              <VoltAiBusinessHealthCard health={data.businessHealth} />
            </div>
          </div>
        </div>
      </section>

      {copilotSuggestions.length > 0 ? (
        <AiCopilotPanel
          suggestions={copilotSuggestions}
          title="AI Copilot"
          description="Proactive recommendations — no question needed."
          className={cn(
            "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
            voltAiAccent.border
          )}
        />
      ) : null}

      {/* Key Insights */}
      <section className="space-y-3">
        <SectionHeading
          emoji="📈"
          title={`Key Insights (${data.keyInsights.length})`}
          badge={!data.aiEnabled ? "Standard recommendations" : undefined}
        />

        {data.isEmpty ? (
          <EmptyState
            icon={Sparkles}
            title="Insights appear as your business grows"
            description="Create estimates and send proposals to unlock margin, revenue, and pipeline recommendations."
            action={
              <Link href="/estimates">
                <Button className={voltAiAccent.button}>Create your first estimate</Button>
              </Link>
            }
            className={cn(
              "rounded-xl border bg-card py-12 motion-safe:animate-in motion-safe:fade-in",
              voltAiAccent.border
            )}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.keyInsights.map((insight, index) => (
              <VoltAiInsightCard key={insight.id} insight={insight} index={index} />
            ))}
          </div>
        )}
      </section>

      {/* Recommended Actions */}
      <section
        className={cn(
          "overflow-hidden rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
          voltAiAccent.border
        )}
      >
        <div className="border-b border-border px-6 py-4">
          <SectionHeading emoji="🎯" title="Recommended Actions" />
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          {highPriority.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                High Priority
              </p>
              <ul className="mt-3 space-y-2">
                {highPriority.map((action) => (
                  <VoltAiActionRow
                    key={action.id}
                    action={action}
                    priority="high"
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {mediumPriority.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Medium Priority
              </p>
              <ul className="mt-3 space-y-2">
                {mediumPriority.map((action) => (
                  <VoltAiActionRow
                    key={action.id}
                    action={action}
                    priority="medium"
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {highPriority.length === 0 && mediumPriority.length === 0 ? (
            <p className="text-sm text-muted-foreground lg:col-span-2">
              No actions flagged right now. Keep building estimates and proposals.
            </p>
          ) : null}
        </div>
      </section>

      {/* Forecast */}
      <section className="space-y-3">
        <SectionHeading emoji="📊" title="Forecast" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.forecastTiles.map((tile, index) => (
            <VoltAiForecastCard key={tile.id} tile={tile} index={index} />
          ))}
        </div>
      </section>

      {/* Ask Volt AI */}
      <VoltAiAskPanel
        question={question}
        onQuestionChange={setQuestion}
        onSubmit={submitQuestion}
        suggestedPrompts={data.suggestedPrompts}
        answer={answer}
        error={error}
        isPending={isPending}
      />

      {/* AI Performance */}
      <section className="space-y-3">
        <SectionHeading emoji="📈" title="AI Performance" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.performance.metrics.map((metric, index) => (
            <VoltAiKpiCard key={metric.id} metric={metric} index={index} />
          ))}
        </div>
      </section>

      {/* Historical Trends — bottom */}
      <VoltAiHistoricalTrendsSection trends={data.historicalTrends} />
    </div>
  );
}
