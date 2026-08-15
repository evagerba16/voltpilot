import Link from "next/link";
import { ArrowRight, BarChart3, Sparkles } from "lucide-react";

import { DashboardAiInsightsCompact } from "@/components/dashboard/dashboard-ai-insights-compact";
import { DashboardContinueWorking } from "@/components/dashboard/dashboard-continue-working";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKpiStrip } from "@/components/dashboard/dashboard-kpi-strip";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { DashboardTodayPriorities } from "@/components/dashboard/dashboard-today-priorities";
import type { DashboardInsightsData } from "@/lib/ai/types";
import type { DashboardOverview } from "@/lib/dashboard/queries";

type DashboardHomeProps = {
  overview: DashboardOverview;
  organizationName: string;
  displayName: string;
  aiInsights: DashboardInsightsData | null;
};

function dedupeByHref<T extends { href: string }>(
  items: T[],
  seen: Set<string>
): T[] {
  return items.filter((item) => {
    if (seen.has(item.href)) {
      return false;
    }

    seen.add(item.href);
    return true;
  });
}

function dedupeDashboardQueues(overview: DashboardOverview): DashboardOverview {
  const seenHrefs = new Set(overview.priorities.map((item) => item.href));

  return {
    ...overview,
    continueWorking: dedupeByHref(overview.continueWorking, seenHrefs),
    recentActivity: dedupeByHref(overview.recentActivity, seenHrefs),
  };
}

export function DashboardHome({
  overview: rawOverview,
  organizationName,
  displayName,
  aiInsights,
}: DashboardHomeProps) {
  const overview = dedupeDashboardQueues(rawOverview);
  return (
    <div className="space-y-10">
      <DashboardHeader
        organizationName={organizationName}
        displayName={displayName}
        isPortfolioEmpty={overview.isPortfolioEmpty}
      />

      <DashboardTodayPriorities
        priorities={overview.priorities}
        hasRisk={overview.hasRisk}
        isPortfolioEmpty={overview.isPortfolioEmpty}
      />

      <DashboardKpiStrip kpis={overview.kpis} />

      <DashboardContinueWorking items={overview.continueWorking} />

      <DashboardRecentActivity items={overview.recentActivity} />

      <section className="space-y-4 border-t border-border/50 pt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Business intelligence
            </p>
            <h2 className="mt-1 text-sm font-medium text-muted-foreground">
              Trends and recommendations — for reflection, not immediate work
            </h2>
          </div>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <BarChart3 className="size-3.5" />
            Open analytics
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {aiInsights ? (
          <DashboardAiInsightsCompact data={aiInsights} />
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 px-5 py-6 text-center">
            <Sparkles className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Bid intelligence appears here as your portfolio grows.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
