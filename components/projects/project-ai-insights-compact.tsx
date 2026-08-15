"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Lightbulb, TriangleAlert } from "lucide-react";

import { ProjectInsightIcon } from "@/components/ai/proposal-assistant-panel";
import { VoltAiEmbeddedPanel } from "@/components/ai/volt-ai-embedded-panel";
import { Button } from "@/components/ui/button";
import { buildVoltAiContextFromProject } from "@/lib/ai/context";
import type { ProjectInsightWithAction } from "@/lib/projects/insights";
import { cn } from "@/lib/utils";

const MAX_INSIGHTS = 3;

function insightCategory(insight: ProjectInsightWithAction) {
  if (insight.severity === "critical" || insight.severity === "warning") {
    return "Needs attention";
  }

  if (insight.category === "action") {
    return "Opportunity";
  }

  return "Informational";
}

function insightRowStyle(insight: ProjectInsightWithAction) {
  if (insight.severity === "critical" || insight.severity === "warning") {
    return "border-l-amber-500/40 bg-amber-500/[0.03]";
  }

  if (insight.category === "action") {
    return "border-l-violet-500/40 bg-violet-500/[0.03]";
  }

  return "border-l-border bg-muted/10";
}

type ProjectAiInsightsCompactProps = {
  projectId: string;
  customerId: string;
  projectName: string;
  insights: ProjectInsightWithAction[];
  summary: string;
};

export function ProjectAiInsightsCompact({
  projectId,
  customerId,
  projectName,
  insights,
  summary,
}: ProjectAiInsightsCompactProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const items = insights.slice(0, MAX_INSIGHTS);
  const context = buildVoltAiContextFromProject(projectId, customerId);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">AI Insights</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{summary}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setPanelOpen(true)}>
            Ask Volt AI
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border/60">
            {items.map((insight) => (
              <li key={insight.id}>
                <div className={cn("border-l-2 px-6 py-4", insightRowStyle(insight))}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {insight.severity === "critical" || insight.severity === "warning" ? (
                        <TriangleAlert className="size-4 text-amber-600" />
                      ) : insight.category === "action" ? (
                        <Lightbulb className="size-4 text-violet-600 dark:text-violet-400" />
                      ) : (
                        <ProjectInsightIcon severity={insight.severity} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {insightCategory(insight)}
                      </span>
                      <p className="mt-1.5 text-sm font-medium">{insight.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{insight.description}</p>
                      {insight.href && insight.actionLabel ? (
                        <Link
                          href={insight.href}
                          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {insight.actionLabel}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      ) : null}
                    </div>
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
        title="Project assistant"
        description={`Risk, schedule, and budget guidance for ${projectName}`}
        context={context}
      />
    </>
  );
}
