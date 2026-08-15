"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Sun } from "lucide-react";

import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import type { DailyBriefing } from "@/lib/ai/daily-briefing";

type DailyAiBriefingProps = {
  briefing: DailyBriefing;
  displayName: string;
};

export function DailyAiBriefing({ briefing, displayName }: DailyAiBriefingProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-violet-500/10 via-primary/5 to-transparent px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Sun className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Daily AI Briefing
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                <DashboardGreeting displayName={displayName} />
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{briefing.headline}</p>
            </div>
          </div>

          <Link
            href="/ai"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Command Center
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        <ul className="space-y-2.5">
          {briefing.bullets.map((bullet) => (
            <li key={bullet.id} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-primary" aria-hidden>
                •
              </span>
              <span>{bullet.message}</span>
            </li>
          ))}
        </ul>

        {briefing.estimatedMonthlyProfit ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
            <Sparkles className="mr-2 inline size-4 text-emerald-600 dark:text-emerald-400" />
            Estimated profit this month:{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {briefing.estimatedMonthlyProfit}
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
