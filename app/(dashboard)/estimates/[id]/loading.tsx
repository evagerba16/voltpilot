import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageLoading } from "@/components/ui/page-loading";

export default function EstimateEditorLoading() {
  return (
    <>
      <DashboardTopNav title="Estimate" />
      <PageLoading label="Loading estimate builder..." />
    </>
  );
}
