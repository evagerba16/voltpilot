"use client";

import Link from "next/link";
import { useTransition } from "react";
import { FileSpreadsheet, Plus } from "lucide-react";

import { createEstimate } from "@/app/(dashboard)/estimates/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency, formatDate } from "@/lib/projects/format";
import { cn } from "@/lib/utils";

export type ProjectEstimateItem = {
  id: string;
  title: string;
  status: string;
  total: number;
  updated_at: string;
};

type ProjectEstimatesProps = {
  projectId: string;
  projectName: string;
  estimates: ProjectEstimateItem[];
  canCreate: boolean;
};

function formatEstimateStatus(status: string) {
  if (status === "Draft") {
    return "In progress";
  }

  return status;
}

export function ProjectEstimates({
  projectId,
  projectName,
  estimates,
  canCreate,
}: ProjectEstimatesProps) {
  const [pending, startTransition] = useTransition();
  const { error: toastError } = useToast();

  function handleCreateEstimate() {
    startTransition(async () => {
      const result = await createEstimate(projectId);

      if (result?.error) {
        toastError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Estimates</h2>
          <p className="text-sm text-muted-foreground">
            Price {projectName} and turn estimates into proposals when you&apos;re ready to bid.
          </p>
        </div>

        {canCreate ? (
          <Button onClick={handleCreateEstimate} disabled={pending}>
            <Plus data-icon="inline-start" />
            {pending ? "Adding..." : "Add estimate"}
          </Button>
        ) : null}
      </div>

      {estimates.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <FileSpreadsheet className="mx-auto size-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">No estimates for this project yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an estimate to break down costs and build a proposal for your bid.
          </p>
          {canCreate ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleCreateEstimate}
              disabled={pending}
            >
              Add estimate
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Estimate</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Total</th>
                <th className="px-2 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {estimates.map((estimate) => (
                <tr key={estimate.id} className="hover:bg-muted/20">
                  <td className="px-2 py-3">
                    <Link
                      href={`/estimates/${estimate.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {estimate.title}
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {formatEstimateStatus(estimate.status)}
                  </td>
                  <td className="px-2 py-3 font-medium tabular-nums">
                    {formatCurrency(estimate.total)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {formatDate(estimate.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {estimates.length > 0 ? (
        <div className="mt-4">
          <Link
            href="/estimates"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View all estimates
          </Link>
        </div>
      ) : null}
    </div>
  );
}
