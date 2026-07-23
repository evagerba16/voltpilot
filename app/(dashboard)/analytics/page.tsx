import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { AnalyticsDashboardLazy } from "@/components/analytics/analytics-dashboard-lazy";
import { AlertBanner } from "@/components/ui/alert-banner";
import { assertPermission } from "@/lib/auth/get-team-context";
import { isPermissionDenied } from "@/lib/auth/permission-errors";
import { precomputeAnalyticsViewModels } from "@/lib/analytics/precompute-view-models";
import {
  getAnalyticsData,
  getCustomerFilterOptions,
  getProjectFilterOptions,
} from "@/lib/analytics/queries";
import type { AnalyticsSection } from "@/lib/analytics/types";
import { parseAnalyticsFilters } from "@/lib/analytics/url";

type AnalyticsPageProps = {
  searchParams: Promise<{
    range?: string;
    customer?: string;
    project?: string;
    status?: string;
    section?: string;
  }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  try {
    await assertPermission("analytics.view");
  } catch (error) {
    if (isPermissionDenied(error)) {
      return (
        <>
          <DashboardTopNav title="Analytics" />
          <PageMain>
            <AlertBanner variant="error" title="Access denied">
              You do not have permission to view analytics.
            </AlertBanner>
          </PageMain>
        </>
      );
    }

    throw error;
  }

  const params = await searchParams;
  const parsed = parseAnalyticsFilters(params);
  const filters = {
    dateRange: parsed.dateRange,
    customerId: parsed.customerId,
    projectId: parsed.projectId,
    projectStatus: parsed.projectStatus,
  };

  let data;
  let customers: Awaited<ReturnType<typeof getCustomerFilterOptions>> = [];
  let projects: Awaited<ReturnType<typeof getProjectFilterOptions>> = [];
  let loadError: string | null = null;

  try {
    [data, customers, projects] = await Promise.all([
      getAnalyticsData(filters),
      getCustomerFilterOptions(),
      getProjectFilterOptions(),
    ]);
  } catch {
    loadError =
      "We couldn't load your analytics. Refresh the page or try again in a moment.";
  }

  const activeSection = parsed.section as AnalyticsSection;
  const precomputed = data ? precomputeAnalyticsViewModels(data) : null;

  return (
    <>
      <DashboardTopNav title="Analytics" />
      <PageMain>
        <PageIntro description="Measure estimating performance, profitability, and business growth with real-time KPIs, interactive charts, and exportable reports." />

        {loadError ? (
          <AlertBanner variant="error" title="Unable to load analytics">
            {loadError}
          </AlertBanner>
        ) : (
          <AnalyticsDashboardLazy
            data={data!}
            customers={customers}
            projects={projects}
            activeSection={activeSection}
            precomputed={precomputed!}
          />
        )}
      </PageMain>
    </>
  );
}
