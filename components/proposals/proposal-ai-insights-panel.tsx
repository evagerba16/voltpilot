"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";

import { ProjectInsightIcon } from "@/components/ai/proposal-assistant-panel";
import { VoltAiEmbeddedPanel } from "@/components/ai/volt-ai-embedded-panel";
import { Button } from "@/components/ui/button";
import { buildVoltAiContextFromProposal } from "@/lib/ai/context";
import type { ProposalInsightWithAction } from "@/lib/proposals/profile-types";
import { cn } from "@/lib/utils";

type ProposalAiInsightsPanelProps = {
  insights: ProposalInsightWithAction[];
  projectId: string;
  customerId: string;
  proposalTitle: string;
  onAction?: (insight: ProposalInsightWithAction) => void;
};

export function ProposalAiInsightsPanel({
  insights,
  projectId,
  customerId,
  proposalTitle,
  onAction,
}: ProposalAiInsightsPanelProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const context = buildVoltAiContextFromProposal(projectId, customerId);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="border-b border-border bg-gradient-to-r from-violet-500/5 via-transparent to-transparent px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">AI Proposal Insights</h2>
                <p className="text-sm text-muted-foreground">
                  Acceptance tips, missing info, pricing, and follow-up guidance
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setPanelOpen(true)}>
              Ask Volt AI
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {insights.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No insights flagged — proposal looks ready.
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
                        {insight.category}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
                {insight.href ? (
                  <Link
                    href={insight.href}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    {insight.actionLabel} →
                  </Link>
                ) : insight.actionLabel ? (
                  <button
                    type="button"
                    onClick={() => onAction?.(insight)}
                    className="shrink-0 text-left text-sm font-medium text-primary hover:underline"
                  >
                    {insight.actionLabel} →
                  </button>
                ) : null}
              </div>
            ))
          )}
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
