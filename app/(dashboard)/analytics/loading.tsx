import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { AnalyticsPageSkeleton } from "@/components/analytics/analytics-page-skeleton";

export default function AnalyticsLoading() {
  return (
    <>
      <DashboardTopNav title="Analytics" />
      <PageMain>
        <AnalyticsPageSkeleton />
      </PageMain>
    </>
  );
}
