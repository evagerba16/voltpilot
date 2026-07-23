"use client";

import { useTransition } from "react";
import { Copy, Download, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { deleteProposal, duplicateProposal } from "@/app/(dashboard)/proposals/actions";
import { ProposalsPagination } from "@/components/proposals/proposals-pagination";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useConfirm } from "@/components/ui/confirm-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast-provider";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatCurrency, formatShortDate, formatProposalStatus } from "@/lib/proposals/format";
import { buildProposalsUrl } from "@/lib/proposals/url";
import { PROPOSAL_STATUS_STYLES, type ProposalListItem } from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

type ProposalsTableProps = {
  proposals: ProposalListItem[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  statusFilter: string;
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
    <div className="flex items-center justify-end gap-1">
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
  total,
  page,
  totalPages,
  search,
  statusFilter,
  onCreateProposal,
}: ProposalsTableProps) {
  const { can } = usePermissions();
  const canEdit = can("proposals.edit");
  const hasFilters = Boolean(search || statusFilter);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Proposal
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Project
              </th>
              <th
                scope="col"
                className="hidden px-6 py-3 font-medium text-muted-foreground md:table-cell"
              >
                Customer
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Amount
              </th>
              <th
                scope="col"
                className="hidden px-6 py-3 font-medium text-muted-foreground lg:table-cell"
              >
                Date
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right font-medium text-muted-foreground"
              >
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
              proposals.map((proposal) => (
                <tr key={proposal.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-6 py-4">
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {proposal.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {proposal.proposal_number ?? "No proposal number"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/projects/${proposal.project.id}`}
                      className="hover:underline"
                    >
                      {proposal.project.project_name}
                    </Link>
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground md:table-cell">
                    {proposal.project.customer.company_name}
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
                  <td className="px-6 py-4 font-medium tabular-nums">
                    {formatCurrency(proposal.amount)}
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground lg:table-cell">
                    {formatShortDate(proposal.proposal_date)}
                  </td>
                  <td className="px-6 py-4">
                    <ProposalRowActions proposal={proposal} />
                  </td>
                </tr>
              ))
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
        />
      ) : null}
    </div>
  );
}
