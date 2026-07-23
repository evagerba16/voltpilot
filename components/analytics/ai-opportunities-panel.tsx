"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  Layers3,
  Sparkles,
  Target,
  Users,
  Wrench,
} from "lucide-react";

import type {
  AiOpportunity,
  AiOpportunitiesResult,
} from "@/lib/analytics/ai-insights-service";
import { cn } from "@/lib/utils";

type AiOpportunitiesPanelProps = {
  opportunities: AiOpportunitiesResult;
};

const categoryIcons = {
  markup: CircleDollarSign,
  proposal_follow_up: Clock3,
  margin_review: Target,
  customer_engagement: Users,
  labor_cost: Wrench,
  material_cost: Layers3,
} as const;

const severityStyles = {
  high: {
    stripe: "bg-red-500",
    badge: "bg-red-500/10 text-red-700 dark:text-red-400",
    label: "High priority",
  },
  medium: {
    stripe: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    label: "Medium priority",
  },
  low: {
    stripe: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    label: "Watch",
  },
} as const;

function OpportunityCard({ opportunity }: { opportunity: AiOpportunity }) {
  const styles = severityStyles[opportunity.severity];
  const Icon = categoryIcons[opportunity.category];

  const content = (
    <article className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className={cn("absolute inset-y-0 left-0 w-1", styles.stripe)} />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
              styles.badge
            )}
          >
            {styles.label}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {opportunity.impactLabel}
          </p>
          <h3 className="text-base font-semibold leading-snug">
            {opportunity.title}
          </h3>
          <p className="text-sm text-muted-foreground">{opportunity.explanation}</p>
        </div>

        <div className="mt-4 rounded-lg bg-muted/30 px-3 py-2.5">
          <p className="text-sm">
            <span className="font-medium">Recommended: </span>
            {opportunity.recommendedAction}
          </p>
        </div>

        {opportunity.href ? (
          <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Take action
            <ArrowRight className="size-4" />
          </p>
        ) : null}
      </div>
    </article>
  );

  if (opportunity.href) {
    return (
      <Link href={opportunity.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function AiOpportunitiesPanel({
  opportunities,
}: AiOpportunitiesPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <BriefcaseBusiness className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  AI Opportunities
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium ring-1 ring-white/10">
                  <Sparkles className="size-3.5" />
                  Executive view
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-white/75">
                {opportunities.subheadline}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium ring-1 ring-white/10">
              {opportunities.opportunities.length}{" "}
              {opportunities.opportunities.length === 1
                ? "opportunity"
                : "opportunities"}
            </span>
            {opportunities.priorityCount > 0 ? (
              <span className="rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-100 ring-1 ring-red-400/20">
                {opportunities.priorityCount} high priority
              </span>
            ) : null}
            {opportunities.source === "rules" ? (
              <span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-medium text-amber-100 ring-1 ring-amber-300/20">
                Standard recommendations
              </span>
            ) : null}
          </div>
        </div>

        <p className="mt-5 text-base font-medium text-white/90">
          {opportunities.headline}
        </p>
      </div>

      <div className="p-6">
        {opportunities.opportunities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
            <Target className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No executive actions flagged</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Expand the date range or add more pipeline activity to surface
              opportunities.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {opportunities.opportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
