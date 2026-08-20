import { DashboardAiInsightsCompact } from "@/components/dashboard/dashboard-ai-insights-compact";
import { DashboardContinueWorking } from "@/components/dashboard/dashboard-continue-working";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
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
      <DashboardHero
        organizationName={organizationName}
        displayName={displayName}
        isPortfolioEmpty={overview.isPortfolioEmpty}
        primaryAction={overview.primaryAction}
      />

      <DashboardTodayPriorities
        priorities={overview.priorities}
        hasRisk={overview.hasRisk}
        isPortfolioEmpty={overview.isPortfolioEmpty}
      />

      <DashboardKpiStrip kpis={overview.kpis} />

      <DashboardContinueWorking items={overview.continueWorking} />

      <DashboardRecentActivity items={overview.recentActivity} />

      {aiInsights ? (
        <section className="space-y-4 border-t border-border/50 pt-10">
          <DashboardAiInsightsCompact data={aiInsights} />
        </section>
      ) : null}
    </div>
  );
}
