import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import { StatCard } from "@/components/dashboard/stat-card";
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
          <PageIntro description="Overview of your estimating and proposal pipeline." />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {dashboardStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {aiInsights ? <AiInsightsPanel data={aiInsights} /> : null}

        <RecentProjects items={recentProjects} />
        </div>
      </PageMain>
    </>
  );
}
