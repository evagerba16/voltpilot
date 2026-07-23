"use client";

import { History, RotateCcw, X } from "lucide-react";

import { restoreEstimateVersion } from "@/app/(dashboard)/estimates/actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  calculateEstimateTotals,
  formatCurrency,
  formatPercent,
} from "@/lib/estimates/calculations";
import type { EstimateBuilderState, EstimateVersion } from "@/lib/estimates/types";
import { cn } from "@/lib/utils";

type EstimateVersionHistoryProps = {
  open: boolean;
  estimateId: string;
  versions: EstimateVersion[];
  onClose: () => void;
  onRestored: (state: EstimateBuilderState) => void;
};

function formatVersionTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function estimateVersionTotals(state: EstimateBuilderState) {
  return calculateEstimateTotals(
    state.line_items,
    state.overhead_percent,
    state.contingency_percent,
    state.profit_margin_percent,
    state.tax_percent
  );
}

export function EstimateVersionHistoryButton({
  onClick,
  versionCount,
}: {
  onClick: () => void;
  versionCount: number;
}) {
  return (
    <Button variant="outline" onClick={onClick}>
      <History data-icon="inline-start" />
      History
      {versionCount > 0 ? (
        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
          {versionCount}
        </span>
      ) : null}
    </Button>
  );
}

export function EstimateVersionHistory({
  open,
  estimateId,
  versions,
  onClose,
  onRestored,
}: EstimateVersionHistoryProps) {
  const confirm = useConfirm();
  const { error: toastError, success } = useToast();

  if (!open) {
    return null;
  }

  async function handleRestore(version: EstimateVersion) {
    const confirmed = await confirm({
      title: `Restore version ${version.version_number}?`,
      description:
        "Your current estimate will be replaced with this saved version. Save again afterward if you want to keep both.",
      confirmLabel: "Restore version",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    const result = await restoreEstimateVersion(estimateId, version.id);

    if ("error" in result || !("state" in result) || !result.state) {
      toastError(
        "error" in result && result.error
          ? result.error
          : "We couldn't restore this version. Try again in a moment."
      );
      return;
    }

    onRestored(result.state);
    onClose();
    success(`Version ${version.version_number} was restored.`);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close version history"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Version history</h2>
            <p className="text-sm text-muted-foreground">
              Saved snapshots from manual saves. Restore an earlier version anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {versions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No saved versions yet. Click &quot;Save estimate&quot; to create your first
              snapshot.
            </div>
          ) : (
            <ul className="space-y-3">
              {versions.map((version) => {
                const totals = estimateVersionTotals(version.snapshot);

                return (
                  <li
                    key={version.id}
                    className="rounded-lg border border-border bg-muted/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Version {version.version_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {version.label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatVersionTime(version.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">
                          {formatCurrency(totals.finalSellingPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercent(totals.grossMarginPercent)} margin
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {version.snapshot.line_items.length} line items ·{" "}
                      {version.snapshot.title}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleRestore(version)}
                    >
                      <RotateCcw data-icon="inline-start" />
                      Restore
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

export function SaveStatusIndicator({
  status,
  savedAt,
}: {
  status: "idle" | "saving" | "saved" | "error";
  savedAt: string | null;
}) {
  if (status === "idle") {
    return null;
  }

  const label =
    status === "saving"
      ? "Saving..."
      : status === "saved" && savedAt
        ? `Saved ${formatVersionTime(savedAt)}`
        : status === "saved"
          ? "All changes saved"
          : "Couldn't save changes";

  return (
    <span
      className={cn(
        "text-sm",
        status === "error"
          ? "text-destructive"
          : status === "saving"
            ? "text-muted-foreground"
            : "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {label}
    </span>
  );
}
