import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageLoading } from "@/components/ui/page-loading";

export default function ProposalEditorLoading() {
  return (
    <>
      <DashboardTopNav title="Proposal" />
      <PageLoading label="Loading proposal..." />
    </>
  );
}
