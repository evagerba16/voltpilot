"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles, TriangleAlert } from "lucide-react";

import { VoltAiEmbeddedPanel } from "@/components/ai/volt-ai-embedded-panel";
import { Button } from "@/components/ui/button";
import { buildVoltAiContextFromJob } from "@/lib/ai/context";
import type { ProjectInsightWithAction } from "@/lib/projects/insights";
import { cn } from "@/lib/utils";

const MAX_INSIGHTS = 3;

type JobCostingAiInsightsCompactProps = {
  projectId: string;
  customerId: string;
  projectName: string;
  insights: ProjectInsightWithAction[];
};

function isJobCostingInsight(insight: ProjectInsightWithAction) {
  return (
    insight.category === "cost_risk" ||
    insight.category === "profitability" ||
    Boolean(insight.href?.includes("job-costing"))
  );
}

export function JobCostingAiInsightsCompact({
  projectId,
  customerId,
  projectName,
  insights,
}: JobCostingAiInsightsCompactProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const items = insights.filter(isJobCostingInsight).slice(0, MAX_INSIGHTS);
  const context = buildVoltAiContextFromJob(projectId, customerId);

  if (items.length === 0) {
    return (
      <>
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            Job looks on budget — Volt AI can still answer cost questions.
          </div>
          <Button size="sm" variant="outline" onClick={() => setPanelOpen(true)}>
            Ask Volt AI
          </Button>
        </section>
        <VoltAiEmbeddedPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          title="Job costing assistant"
          description={`Budget and profitability for ${projectName}`}
          context={context}
        />
      </>
    );
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-tight">Job alerts</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setPanelOpen(true)}>
            Ask Volt AI
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border/60">
            {items.map((insight) => (
              <li
                key={insight.id}
                className={cn(
                  "border-l-2 px-5 py-3.5",
                  insight.severity === "critical" || insight.severity === "warning"
                    ? "border-l-amber-500/40 bg-amber-500/[0.03]"
                    : "border-l-border bg-muted/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{insight.description}</p>
                    {insight.actionLabel && insight.href ? (
                      <Link
                        href={insight.href}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {insight.actionLabel}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    ) : insight.actionLabel ? (
                      <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        {insight.actionLabel}
                        <ArrowRight className="size-3.5" />
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <VoltAiEmbeddedPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Job costing assistant"
        description={`Budget and profitability for ${projectName}`}
        context={context}
      />
    </>
  );
}
