import { CompanyDashboard } from "@/components/dashboard/company-dashboard";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { getDashboardInsights } from "@/lib/ai/dashboard-insights";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { getOrganizationEntitlements } from "@/lib/billing/entitlements";
import {
  getCompanyDashboardOverview,
  isCompanyDashboardEligible,
} from "@/lib/dashboard/company-overview";
import { getDashboardOverview } from "@/lib/dashboard/queries";

export default async function DashboardPage() {
  const context = await getTeamContext();

  if (context) {
    const entitlements = await getOrganizationEntitlements(context.organizationId);

    if (isCompanyDashboardEligible(context.role, entitlements.planType)) {
      const companyOverview = await getCompanyDashboardOverview(
        context.organizationId,
        context.organizationName,
        context.userId
      );

      return (
        <>
          <DashboardTopNav title="Dashboard" />
          <PageMain>
            <CompanyDashboard
              overview={companyOverview}
              displayName={context.displayName}
            />
          </PageMain>
        </>
      );
    }
  }

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
