import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { getDashboardInsights } from "@/lib/ai/dashboard-insights";
import { getDashboardStats } from "@/lib/dashboard/queries";
import { getRecentProjects } from "@/lib/projects/queries";

export default async function DashboardPage() {
  const context = await getTeamContext();

  const [dashboardStats, recentProjects, aiInsights] = await Promise.all([
    getDashboardStats(),
    getRecentProjects(),
    context ? getDashboardInsights(context.organizationId) : Promise.resolve(null),
  ]);

  return (
    <>
      <DashboardTopNav title="Dashboard" />
      <PageMain>
        <div className="space-y-8">
          <PageIntro
            description={
              dashboardStats.isPortfolioEmpty
                ? "Add a customer and project, then create your first estimate to start building proposals and tracking pipeline value."
                : "Overview of your estimating and proposal pipeline."
            }
          />

          <DashboardStats
            stats={dashboardStats.items}
            isPortfolioEmpty={dashboardStats.isPortfolioEmpty}
          />

          {aiInsights ? <AiInsightsPanel data={aiInsights} /> : null}

          <RecentProjects items={recentProjects} />
        </div>
      </PageMain>
    </>
  );
}
