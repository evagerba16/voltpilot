"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { FileText } from "lucide-react";

import { createProposalFromEstimate } from "@/app/(dashboard)/proposals/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { buttonVariants } from "@/components/ui/button-variants";
import { selectClassName } from "@/lib/ui/form-classes";
import { formatCurrency } from "@/lib/proposals/format";
import type { EstimateOption } from "@/lib/proposals/queries";

type CreateProposalDialogProps = {
  open: boolean;
  onClose: () => void;
  estimates: EstimateOption[];
};

export function CreateProposalDialog({
  open,
  onClose,
  estimates,
}: CreateProposalDialogProps) {
  const [estimateId, setEstimateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setError(null);
      setEstimateId(estimates[0]?.id ?? "");
    }
  }, [open, estimates]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!estimateId) {
      setError("Select an estimate to continue.");
      return;
    }

    startTransition(async () => {
      const result = await createProposalFromEstimate(estimateId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add proposal"
      description="Start from an estimate you've already priced for this job."
    >
      {estimates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No estimates yet"
          description="Price the job with an estimate first, then turn it into a proposal to send to your customer."
          action={
            <Link href="/estimates" className={buttonVariants()} onClick={onClose}>
              Go to estimates
            </Link>
          }
          className="py-8"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
          <div className="space-y-2">
            <label htmlFor="estimate_id" className="text-sm font-medium">
              Estimate
            </label>
            <select
              id="estimate_id"
              value={estimateId}
              onChange={(e) => setEstimateId(e.target.value)}
              className={selectClassName}
            >
              {estimates.map((estimate) => (
                <option key={estimate.id} value={estimate.id}>
                  {estimate.title} — {estimate.project.project_name} (
                  {formatCurrency(estimate.selling_price)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding..." : "Add proposal"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
