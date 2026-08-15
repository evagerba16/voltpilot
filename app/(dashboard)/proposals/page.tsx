import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { ProposalsStats } from "@/components/proposals/proposals-stats";
import { ProposalsView } from "@/components/proposals/proposals-view";
import { AlertBanner } from "@/components/ui/alert-banner";
import { buildProposalListMetrics } from "@/lib/proposals/profile";
import {
  getEstimateOptionsForProposals,
  getProposalStats,
  getProposals,
} from "@/lib/proposals/queries";
import type { ProposalSortField } from "@/lib/proposals/types";

type ProposalsPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    sort?: string;
    order?: string;
  }>;
};

export default async function ProposalsPage({ searchParams }: ProposalsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";
  const statusFilter = params.status?.trim() ?? "";
  const sort = (["proposal_date", "amount", "status", "created_at"].includes(
    params.sort ?? ""
  )
    ? params.sort
    : "created_at") as ProposalSortField;
  const order = params.order === "asc" ? "asc" : "desc";

  let data;
  let estimates: Awaited<ReturnType<typeof getEstimateOptionsForProposals>> = [];
  let stats: Awaited<ReturnType<typeof getProposalStats>> | null = null;
  let loadError: string | null = null;

  try {
    [data, estimates, stats] = await Promise.all([
      getProposals({ page, search, status: statusFilter, sort, order }),
      getEstimateOptionsForProposals(),
      getProposalStats(),
    ]);
  } catch {
    loadError =
      "We couldn't load your proposals. Refresh the page or try again in a moment.";
  }

  const listMetrics = Object.fromEntries(
    (data?.proposals ?? []).map((proposal) => [
      proposal.id,
      buildProposalListMetrics(proposal),
    ])
  );

  return (
    <>
      <DashboardTopNav title="Proposals" />
      <PageMain>
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
                orgAnalytics={stats.orgAnalytics}
                compact
              />
            ) : null}
            <ProposalsView
              proposals={data!.proposals}
              listMetrics={listMetrics}
              estimates={estimates}
              total={data!.total}
              page={data!.page}
              totalPages={data!.totalPages}
              search={search}
              statusFilter={statusFilter}
              sort={sort}
              order={order}
            />
          </>
        )}
      </PageMain>
    </>
  );
}
