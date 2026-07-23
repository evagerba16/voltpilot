import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { ProposalsStats } from "@/components/proposals/proposals-stats";
import { ProposalsView } from "@/components/proposals/proposals-view";
import { AlertBanner } from "@/components/ui/alert-banner";
import {
  getEstimateOptionsForProposals,
  getProposalStats,
  getProposals,
} from "@/lib/proposals/queries";

type ProposalsPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
  }>;
};

export default async function ProposalsPage({ searchParams }: ProposalsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";
  const statusFilter = params.status?.trim() ?? "";

  let data;
  let estimates: Awaited<ReturnType<typeof getEstimateOptionsForProposals>> = [];
  let stats: Awaited<ReturnType<typeof getProposalStats>> | null = null;
  let loadError: string | null = null;

  try {
    [data, estimates, stats] = await Promise.all([
      getProposals({ page, search, status: statusFilter }),
      getEstimateOptionsForProposals(),
      getProposalStats(),
    ]);
  } catch {
    loadError =
      "We couldn't load your proposals. Refresh the page or try again in a moment.";
  }

  return (
    <>
      <DashboardTopNav title="Proposals" />
      <PageMain>
        <PageIntro description="Turn finalized estimates into polished bids—edit, preview, send to customers, and track responses." />

        {loadError ? (
          <AlertBanner variant="error" title="Unable to load proposals">
            {loadError}
          </AlertBanner>
        ) : (
          <>
            {stats ? (
              <ProposalsStats
                draft={stats.draft}
                sent={stats.sent}
                won={stats.won}
                pipeline={stats.pipeline}
              />
            ) : null}
            <ProposalsView
              proposals={data!.proposals}
              estimates={estimates}
              total={data!.total}
              page={data!.page}
              totalPages={data!.totalPages}
              search={search}
              statusFilter={statusFilter}
            />
          </>
        )}
      </PageMain>
    </>
  );
}
