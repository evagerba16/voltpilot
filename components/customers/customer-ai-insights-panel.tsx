import Link from "next/link";
import { Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import type { CustomerAiInsight } from "@/lib/customers/types";
import { cn } from "@/lib/utils";

const toneStyles = {
  warning: "border-amber-500/20 bg-amber-500/5",
  success: "border-emerald-500/20 bg-emerald-500/5",
  info: "border-primary/20 bg-primary/5",
  opportunity: "border-violet-500/20 bg-violet-500/5",
} as const;

type CustomerAiInsightsPanelProps = {
  insights: CustomerAiInsight[];
};

export function CustomerAiInsightsPanel({ insights }: CustomerAiInsightsPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">AI Customer Insights</h2>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Follow-ups, revenue signals, and suggested next steps.
        </p>
      </div>

      <div className="space-y-3 p-6">
        {insights.map((insight, index) => (
          <article
            key={insight.id}
            className={cn(
              "rounded-xl border p-4 transition-all motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-sm",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-backwards",
              toneStyles[insight.tone]
            )}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <h3 className="text-sm font-semibold">{insight.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
            <Link
              href={insight.href}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3 inline-flex")}
            >
              {insight.actionLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
