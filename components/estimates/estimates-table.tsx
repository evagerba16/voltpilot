"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Calculator, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

import { duplicateEstimate } from "@/app/(dashboard)/estimates/actions";
import { EstimatesPagination } from "@/components/estimates/estimates-pagination";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast-provider";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatCurrency } from "@/lib/estimates/calculations";
import type { ProjectOption } from "@/lib/estimates/queries";
import type { EstimateListItem } from "@/lib/estimates/types";
import { cn } from "@/lib/utils";

type EstimatesTableProps = {
  estimates: EstimateListItem[];
  projects: ProjectOption[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  projectFilter: string;
  onCreateEstimate?: () => void;
};

function formatEstimateStatus(status: string) {
  if (status === "Draft") {
    return "In progress";
  }

  return status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function EstimateRowActions({ estimate }: { estimate: EstimateListItem }) {
  const { can } = usePermissions();
  const canEdit = can("estimates.edit");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateEstimate(estimate.id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${estimate.title} was duplicated.`);
    });
  }

  if (!canEdit) {
    return null;
  }

  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      {pending ? <Spinner className="mr-1" /> : null}
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={pending}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        aria-label={`Duplicate ${estimate.title}`}
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

export function EstimatesTable({
  estimates,
  total,
  page,
  totalPages,
  search,
  projectFilter,
  onCreateEstimate,
}: EstimatesTableProps) {
  const router = useRouter();
  const hasFilters = Boolean(search || projectFilter);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 font-medium text-muted-foreground">Estimate</th>
              <th className="px-6 py-3 font-medium text-muted-foreground">Project</th>
              <th className="hidden px-6 py-3 font-medium text-muted-foreground md:table-cell">
                Customer
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground">Total</th>
              <th className="hidden px-6 py-3 font-medium text-muted-foreground lg:table-cell">
                Updated
              </th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {estimates.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    icon={Calculator}
                    title={hasFilters ? "No estimates match your filters" : "No estimates yet"}
                    description={
                      hasFilters
                        ? "Try a different search term or clear your filters."
                        : "Add an estimate to price a project and turn it into a proposal when you're ready to bid."
                    }
                    action={
                      hasFilters ? (
                        <Link
                          href="/estimates"
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Clear filters
                        </Link>
                      ) : onCreateEstimate ? (
                        <Button onClick={onCreateEstimate}>Add estimate</Button>
                      ) : null
                    }
                  />
                </td>
              </tr>
            ) : (
              estimates.map((estimate) => (
                <tr
                  key={estimate.id}
                  className="cursor-pointer transition-colors hover:bg-muted/20"
                  onClick={() => router.push(`/estimates/${estimate.id}`)}
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-primary">{estimate.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatEstimateStatus(estimate.status)}
                    </p>
                  </td>
                  <td className="px-6 py-4">{estimate.project.project_name}</td>
                  <td className="hidden px-6 py-4 text-muted-foreground md:table-cell">
                    {estimate.project.customer.company_name}
                  </td>
                  <td className="px-6 py-4 font-medium tabular-nums">
                    {formatCurrency(estimate.selling_price || estimate.grand_total)}
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground lg:table-cell">
                    {formatDate(estimate.updated_at)}
                  </td>
                  <td className="px-6 py-4">
                    <EstimateRowActions estimate={estimate} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <EstimatesPagination
          page={page}
          totalPages={totalPages}
          total={total}
          search={search}
          projectFilter={projectFilter}
        />
      ) : null}
    </div>
  );
}
