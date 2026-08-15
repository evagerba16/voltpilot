"use client";

import { useState } from "react";
import { ArrowRight, Lightbulb, TriangleAlert } from "lucide-react";

import { ProjectInsightIcon } from "@/components/ai/proposal-assistant-panel";
import { VoltAiEmbeddedPanel } from "@/components/ai/volt-ai-embedded-panel";
import { Button } from "@/components/ui/button";
import { buildVoltAiContextFromProposal } from "@/lib/ai/context";
import type { ProposalInsightWithAction } from "@/lib/proposals/profile-types";
import { cn } from "@/lib/utils";

const MAX_INSIGHTS = 3;

function insightCategory(insight: ProposalInsightWithAction) {
  if (insight.severity === "critical" || insight.severity === "warning") {
    return "Needs attention";
  }

  if (insight.category === "Follow-up") {
    return "Opportunity";
  }

  return "Informational";
}

function insightRowStyle(insight: ProposalInsightWithAction) {
  if (insight.severity === "critical" || insight.severity === "warning") {
    return "border-l-amber-500/40 bg-amber-500/[0.03]";
  }

  if (insight.category === "Follow-up") {
    return "border-l-violet-500/40 bg-violet-500/[0.03]";
  }

  return "border-l-border bg-muted/10";
}

type ProposalAiInsightsCompactProps = {
  insights: ProposalInsightWithAction[];
  projectId: string;
  customerId: string;
  proposalTitle: string;
  onAction?: (insight: ProposalInsightWithAction) => void;
};

export function ProposalAiInsightsCompact({
  insights,
  projectId,
  customerId,
  proposalTitle,
  onAction,
}: ProposalAiInsightsCompactProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const items = insights.slice(0, MAX_INSIGHTS);
  const context = buildVoltAiContextFromProposal(projectId, customerId);

  if (items.length === 0) {
    return (
      <>
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-5 py-4">
          <p className="text-sm text-muted-foreground">Proposal looks ready to send.</p>
          <Button size="sm" variant="outline" onClick={() => setPanelOpen(true)}>
            Ask Volt AI
          </Button>
        </section>
        <VoltAiEmbeddedPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          title="Proposal assistant"
          description={`Communication guidance for ${proposalTitle}`}
          context={context}
        />
      </>
    );
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Quick checks</h2>
          <Button size="sm" variant="ghost" onClick={() => setPanelOpen(true)}>
            Ask Volt AI
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border/60">
            {items.map((insight) => (
              <li
                key={insight.id}
                className={cn("border-l-2 px-5 py-3.5", insightRowStyle(insight))}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {insight.severity === "critical" || insight.severity === "warning" ? (
                        <TriangleAlert className="size-4 text-amber-600" />
                      ) : insight.category === "Follow-up" ? (
                        <Lightbulb className="size-4 text-violet-600 dark:text-violet-400" />
                      ) : (
                        <ProjectInsightIcon severity={insight.severity} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {insightCategory(insight)}
                      </span>
                      <p className="mt-1.5 text-sm font-medium">{insight.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                  {insight.actionLabel ? (
                    insight.onActionField ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => onAction?.(insight)}
                      >
                        {insight.actionLabel}
                      </Button>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                        onClick={() => onAction?.(insight)}
                      >
                        {insight.actionLabel}
                        <ArrowRight className="size-3.5" />
                      </button>
                    )
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <VoltAiEmbeddedPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Proposal assistant"
        description={`Communication and acceptance guidance for ${proposalTitle}`}
        context={context}
      />
    </>
  );
}
