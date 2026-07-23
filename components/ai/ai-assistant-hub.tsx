import Link from "next/link";
import {
  Building2,
  FileText,
  FolderKanban,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { getOpenAIConfig } from "@/lib/ai/env";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  {
    title: "AI Estimate Review",
    description:
      "Identify missing materials and labor, detect duplicates, flag pricing anomalies, low margins, and estimating risks.",
    href: "/estimates",
    icon: Building2,
  },
  {
    title: "AI Proposal Assistant",
    description:
      "Generate scope of work, rewrite professionally, improve clarity, and draft exclusions and assumptions.",
    href: "/proposals",
    icon: FileText,
  },
  {
    title: "AI Project Insights",
    description:
      "Assess project complexity, highlight cost risks, and find profitability opportunities on project detail pages.",
    href: "/projects",
    icon: FolderKanban,
  },
];

export function AiAssistantHub() {
  const { isConfigured } = getOpenAIConfig();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">VoltPilot AI Assistant</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Intelligent estimating and proposal assistance for commercial
                electrical contractors. AI provides recommendations only — your
                estimates and proposals are never modified without approval.
              </p>
            </div>
          </div>
          <div
            className={cn(
              "rounded-lg px-4 py-3 text-sm",
              isConfigured
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            {isConfigured
              ? "AI features are ready"
              : "AI features are limited right now. Basic recommendations are still available."}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {CAPABILITIES.map((capability) => {
          const Icon = capability.icon;

          return (
            <div
              key={capability.title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold">{capability.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {capability.description}
              </p>
              <Link
                href={capability.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
              >
                Open module
              </Link>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-base font-semibold">How it works</h3>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">1. Review estimates</span> —
            Open any estimate and click &quot;Review estimate&quot; for AI-powered
            suggestions on materials, labor, pricing, and margins.
          </li>
          <li>
            <span className="font-medium text-foreground">2. Draft proposals</span> —
            Use the AI Assistant in the proposal editor to generate professional
            scope, exclusions, and summaries. Apply only what you approve.
          </li>
          <li>
            <span className="font-medium text-foreground">3. Monitor portfolio</span> —
            Check the AI Insights panel on your dashboard for estimates requiring
            review, low-margin projects, and recommended next actions.
          </li>
        </ol>
        <div className="mt-5">
          <Link href="/dashboard">
            <Button variant="outline">View dashboard insights</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
