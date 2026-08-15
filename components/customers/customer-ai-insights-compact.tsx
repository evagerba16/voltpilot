"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Lightbulb, Sparkles, TriangleAlert } from "lucide-react";

import { VoltAiEmbeddedPanel } from "@/components/ai/volt-ai-embedded-panel";
import { Button } from "@/components/ui/button";
import { buildVoltAiContextFromCustomer } from "@/lib/ai/context";
import type { CustomerAiInsight } from "@/lib/customers/types";
import { cn } from "@/lib/utils";

const MAX_INSIGHTS = 3;

const toneToCategory = {
  warning: "Needs attention",
  opportunity: "Opportunity",
  info: "Informational",
  success: "Informational",
} as const;

const toneStyles = {
  warning: "border-l-amber-500/40 bg-amber-500/[0.03]",
  opportunity: "border-l-violet-500/40 bg-violet-500/[0.03]",
  info: "border-l-border bg-muted/10",
  success: "border-l-border bg-muted/10",
} as const;

type CustomerAiInsightsCompactProps = {
  customerId: string;
  customerName: string;
  insights: CustomerAiInsight[];
};

export function CustomerAiInsightsCompact({
  customerId,
  customerName,
  insights,
}: CustomerAiInsightsCompactProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const items = insights.slice(0, MAX_INSIGHTS);
  const context = buildVoltAiContextFromCustomer(customerId);

  if (items.length === 0) {
    return (
      <>
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            No insights right now — ask Volt AI for follow-up ideas.
          </div>
          <Button size="sm" variant="outline" onClick={() => setPanelOpen(true)}>
            Ask Volt AI
          </Button>
        </section>
        <VoltAiEmbeddedPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          title="Customer assistant"
          description={`Follow-ups and communication for ${customerName}`}
          context={context}
        />
      </>
    );
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">AI Insights</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              What matters for this customer right now
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setPanelOpen(true)}>
            Ask Volt AI
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border/60">
            {items.map((insight) => (
              <li key={insight.id}>
                <div className={cn("border-l-2 px-6 py-4", toneStyles[insight.tone])}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-muted-foreground">
                      {insight.tone === "warning" ? (
                        <TriangleAlert className="size-4" />
                      ) : insight.tone === "opportunity" ? (
                        <Lightbulb className="size-4" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {toneToCategory[insight.tone]}
                      </span>
                      <p className="mt-1.5 text-sm font-medium">{insight.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{insight.description}</p>
                      <Link
                        href={insight.href}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {insight.actionLabel}
                        <ArrowRight className="size-3.5" />
                      </Link>
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
        title="Customer assistant"
        description={`Follow-ups and communication for ${customerName}`}
        context={context}
      />
    </>
  );
}
