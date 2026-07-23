"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { CreateProposalDialog } from "@/components/proposals/create-proposal-dialog";
import { ProposalsTable } from "@/components/proposals/proposals-table";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPageHeader } from "@/components/ui/list-page-header";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cardClassName } from "@/lib/ui/form-classes";
import { formatProposalStatus } from "@/lib/proposals/format";
import type { EstimateOption } from "@/lib/proposals/queries";
import { PROPOSAL_STATUSES, type ProposalListItem } from "@/lib/proposals/types";
import { buildProposalsUrl } from "@/lib/proposals/url";

type ProposalsViewProps = {
  proposals: ProposalListItem[];
  estimates: EstimateOption[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  statusFilter: string;
};

export function ProposalsView({
  proposals,
  estimates,
  total,
  page,
  totalPages,
  search,
  statusFilter,
}: ProposalsViewProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("proposals.edit");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const navigate = useCallback(
    (params: { q?: string; status?: string }) => {
      router.replace(
        buildProposalsUrl({
          q: params.q ?? search,
          status: params.status ?? statusFilter,
          page: 1,
        })
      );
    },
    [router, search, statusFilter]
  );

  const handleSearchChange = useCallback(
    (query: string) => navigate({ q: query }),
    [navigate]
  );

  const chips = [
    statusFilter ? { key: "status", label: "Status", value: formatProposalStatus(statusFilter) } : null,
    search ? { key: "q", label: "Search", value: search } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <>
      <div className={cardClassName}>
        <ListPageHeader
          title="Proposal library"
          description="All your bids in one place—open any proposal to edit, preview, and send to customers."
          action={
            canEdit ? (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus data-icon="inline-start" />
                Add proposal
              </Button>
            ) : undefined
          }
        />

        <FilterBar
          search={search}
          searchPlaceholder="Search by title, number, project, or customer..."
          onSearchChange={handleSearchChange}
          chips={chips}
          onClearChip={(key) => {
            if (key === "status") navigate({ status: "" });
            if (key === "q") navigate({ q: "" });
          }}
          onClearAll={() => router.push(buildProposalsUrl({ page: 1 }))}
          filters={
            <FilterSelect
              label="Filter by status"
              value={statusFilter}
              onChange={(value) => navigate({ status: value })}
            >
              <option value="">All statuses</option>
              {PROPOSAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatProposalStatus(status)}
                </option>
              ))}
            </FilterSelect>
          }
        />
      </div>

      <ProposalsTable
        proposals={proposals}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        statusFilter={statusFilter}
        onCreateProposal={canEdit ? () => setCreateDialogOpen(true) : undefined}
      />

      {canEdit ? (
        <CreateProposalDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          estimates={estimates}
        />
      ) : null}
    </>
  );
}
