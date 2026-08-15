import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { getDashboardInsights } from "@/lib/ai/dashboard-insights";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { getDashboardOverview } from "@/lib/dashboard/queries";

export default async function DashboardPage() {
  const context = await getTeamContext();

  const [overview, aiInsights] = await Promise.all([
    getDashboardOverview(),
    context ? getDashboardInsights(context.organizationId) : Promise.resolve(null),
  ]);

  return (
    <>
      <DashboardTopNav title="Dashboard" />
      <PageMain>
        <DashboardHome
          overview={overview}
          organizationName={context?.organizationName ?? "Your company"}
          displayName={context?.displayName ?? "there"}
          aiInsights={aiInsights}
        />
      </PageMain>
    </>
  );
}
