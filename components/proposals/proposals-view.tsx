"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { CreateProposalDialog } from "@/components/proposals/create-proposal-dialog";
import { ProposalsTable } from "@/components/proposals/proposals-table";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPageHeader } from "@/components/ui/list-page-header";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cardClassName } from "@/lib/ui/form-classes";
import { ENTITY_PRIMARY_QUESTIONS } from "@/lib/ui/entity-page-copy";
import type { ProposalListMetrics } from "@/lib/proposals/profile-types";
import { formatProposalStatus } from "@/lib/proposals/format";
import type { EstimateOption } from "@/lib/proposals/queries";
import {
  PROPOSAL_SORT_FIELDS,
  PROPOSAL_STATUSES,
  type ProposalListItem,
  type ProposalSortField,
} from "@/lib/proposals/types";
import { buildProposalsUrl } from "@/lib/proposals/url";

type ProposalsViewProps = {
  proposals: ProposalListItem[];
  listMetrics: Record<string, ProposalListMetrics>;
  estimates: EstimateOption[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  statusFilter: string;
  sort: ProposalSortField;
  order: "asc" | "desc";
};

const sortLabels: Record<ProposalSortField, string> = {
  proposal_date: "Proposal date",
  amount: "Value",
  status: "Status",
  created_at: "Created date",
};

export function ProposalsView({
  proposals,
  listMetrics,
  estimates,
  total,
  page,
  totalPages,
  search,
  statusFilter,
  sort,
  order,
}: ProposalsViewProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("proposals.edit");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [instantSearch, setInstantSearch] = useState(search);

  useEffect(() => {
    setInstantSearch(search);
  }, [search]);

  const navigate = useCallback(
    (params: {
      q?: string;
      status?: string;
      sort?: ProposalSortField;
      order?: "asc" | "desc";
    }) => {
      router.replace(
        buildProposalsUrl({
          q: params.q ?? search,
          status: params.status ?? statusFilter,
          sort: params.sort ?? sort,
          order: params.order ?? order,
          page: 1,
        })
      );
    },
    [router, search, statusFilter, sort, order]
  );

  useEffect(() => {
    if (instantSearch === search) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigate({ q: instantSearch });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [instantSearch, search, navigate]);

  const chips = [
    statusFilter ? { key: "status", label: "Status", value: formatProposalStatus(statusFilter) } : null,
    search ? { key: "q", label: "Search", value: search } : null,
    sort !== "created_at" || order !== "desc"
      ? { key: "sort", label: "Sort", value: `${sortLabels[sort]} (${order})` }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <>
      <div className={cardClassName}>
        <ListPageHeader
          title="Proposals"
          description={ENTITY_PRIMARY_QUESTIONS.proposalsList}
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
          search={instantSearch}
          searchPlaceholder="Search by title, number, project, or customer..."
          onSearchChange={setInstantSearch}
          chips={chips}
          onClearChip={(key) => {
            if (key === "status") navigate({ status: "" });
            if (key === "q") {
              setInstantSearch("");
              navigate({ q: "" });
            }
            if (key === "sort") navigate({ sort: "created_at", order: "desc" });
          }}
          onClearAll={() => router.push(buildProposalsUrl({ page: 1 }))}
          filters={
            <>
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
              <FilterSelect
                label="Sort by"
                value={sort}
                onChange={(value) =>
                  navigate({ sort: value as ProposalSortField })
                }
              >
                {PROPOSAL_SORT_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {sortLabels[field]}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Order"
                value={order}
                onChange={(value) => navigate({ order: value as "asc" | "desc" })}
              >
                <option value="desc">Newest / highest first</option>
                <option value="asc">Oldest / lowest first</option>
              </FilterSelect>
            </>
          }
        />
      </div>

      <ProposalsTable
        proposals={proposals}
        listMetrics={listMetrics}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        statusFilter={statusFilter}
        sort={sort}
        order={order}
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
