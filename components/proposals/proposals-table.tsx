"use client";

import { useTransition } from "react";
import { Copy, Download, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { deleteProposal, duplicateProposal } from "@/app/(dashboard)/proposals/actions";
import { ProposalsPagination } from "@/components/proposals/proposals-pagination";
import { RelativeTime } from "@/components/ui/relative-time";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useConfirm } from "@/components/ui/confirm-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast-provider";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { ProposalListMetrics } from "@/lib/proposals/profile-types";
import {
  formatCurrency,
  formatProposalStatus,
  formatShortDate,
} from "@/lib/proposals/format";
import { buildProposalsUrl } from "@/lib/proposals/url";
import {
  PROPOSAL_STATUS_STYLES,
  type ProposalListItem,
  type ProposalSortField,
} from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

type ProposalsTableProps = {
  proposals: ProposalListItem[];
  listMetrics: Record<string, ProposalListMetrics>;
  total: number;
  page: number;
  totalPages: number;
  search: string;
  statusFilter: string;
  sort: ProposalSortField;
  order: "asc" | "desc";
  onCreateProposal?: () => void;
};

function ProposalRowActions({ proposal }: { proposal: ProposalListItem }) {
  const { can } = usePermissions();
  const canEdit = can("proposals.edit");
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateProposal(proposal.id);
      if (result?.error) {
        toastError(result.error);
        return;
      }
      success(`${proposal.title} was duplicated.`);
    });
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Delete ${proposal.title}?`,
      description: "This proposal will be permanently removed. This can't be undone.",
      confirmLabel: "Delete proposal",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProposal(proposal.id);
      if (result?.error) {
        toastError(result.error);
        return;
      }
      success(`${proposal.title} was deleted.`);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
      <Link
        href={`/proposals/${proposal.id}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        aria-label={`View ${proposal.title}`}
      >
        <Eye className="size-3.5" />
      </Link>
      {canEdit ? (
        <Link
          href={`/proposals/${proposal.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          aria-label={`Edit ${proposal.title}`}
        >
          <Pencil className="size-3.5" />
        </Link>
      ) : null}
      <a
        href={`/proposals/${proposal.id}/pdf`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        aria-label={`Download ${proposal.title}`}
      >
        <Download className="size-3.5" />
      </a>
      {canEdit ? (
        <>
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={pending}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            aria-label={`Duplicate ${proposal.title}`}
          >
            {pending ? <Spinner className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "text-destructive hover:bg-destructive/10 hover:text-destructive"
            )}
            aria-label={`Delete ${proposal.title}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        </>
      ) : null}
    </div>
  );
}

export function ProposalsTable({
  proposals,
  listMetrics,
  total,
  page,
  totalPages,
  search,
  statusFilter,
  sort,
  order,
  onCreateProposal,
}: ProposalsTableProps) {
  const { can } = usePermissions();
  const canEdit = can("proposals.edit");
  const hasFilters = Boolean(search || statusFilter);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Proposal
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Customer
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Value / Profit
              </th>
              <th scope="col" className="hidden px-6 py-3 font-medium text-muted-foreground lg:table-cell">
                Last activity
              </th>
              <th scope="col" className="hidden px-6 py-3 font-medium text-muted-foreground md:table-cell">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon={FileText}
                    title={
                      hasFilters ? "No proposals match your filters" : "No proposals yet"
                    }
                    description={
                      hasFilters
                        ? "Try a different search term or clear your filters."
                        : "Finalize an estimate first, then create a proposal to send a professional bid to your customer."
                    }
                    action={
                      hasFilters ? (
                        <Link
                          href={buildProposalsUrl({})}
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Clear filters
                        </Link>
                      ) : onCreateProposal && canEdit ? (
                        <Button onClick={onCreateProposal}>Create your first proposal</Button>
                      ) : null
                    }
                  />
                </td>
              </tr>
            ) : (
              proposals.map((proposal) => {
                const metrics = listMetrics[proposal.id];
                return (
                  <tr
                    key={proposal.id}
                    className="group transition-all duration-200 hover:bg-muted/20 hover:shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/proposals/${proposal.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {proposal.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {proposal.proposal_number ?? "No proposal number"} ·{" "}
                        {proposal.project.project_name}
                      </p>
                      {metrics?.needsFollowUp ? (
                        <span className="mt-1 inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                          Needs follow-up
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {metrics?.customerInitials ?? "?"}
                        </span>
                        <div>
                          <p className="font-medium">{proposal.project.customer.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {proposal.project.customer.contact_name ?? "Customer"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          PROPOSAL_STATUS_STYLES[proposal.status]
                        )}
                      >
                        {formatProposalStatus(proposal.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold tabular-nums">{formatCurrency(proposal.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Profit {formatCurrency(metrics?.estimatedProfit ?? 0)}
                        {metrics && metrics.grossMarginPercent > 0
                          ? ` · ${metrics.grossMarginPercent.toFixed(1)}% margin`
                          : ""}
                      </p>
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell">
                      {metrics?.lastActivityAt ? (
                        <RelativeTime
                          value={metrics.lastActivityAt}
                          className="text-sm text-muted-foreground"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {metrics?.lastActivityLabel ?? "No activity"}
                      </p>
                    </td>
                    <td className="hidden px-6 py-4 text-muted-foreground md:table-cell">
                      {formatShortDate(proposal.proposal_date)}
                    </td>
                    <td className="px-6 py-4">
                      <ProposalRowActions proposal={proposal} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <ProposalsPagination
          page={page}
          totalPages={totalPages}
          total={total}
          search={search}
          statusFilter={statusFilter}
          sort={sort}
          order={order}
        />
      ) : null}
    </div>
  );
}
