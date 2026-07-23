"use client";

import { Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ESTIMATE_CATEGORIES,
  ESTIMATE_CATEGORY_LABELS,
  type EstimateCategory,
} from "@/lib/estimates/types";
import { cn } from "@/lib/utils";

type BulkActionsToolbarProps = {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onMoveToCategory: (category: EstimateCategory) => void;
  onApplyMarkup: (percentIncrease: number) => void;
};

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onDelete,
  onMoveToCategory,
  onApplyMarkup,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const lineLabel = selectedCount === 1 ? "line" : "lines";

  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div
        className={cn(
          "flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-lg",
          "animate-in slide-in-from-bottom-4 fade-in duration-200"
        )}
      >
        <span className="mr-1 text-sm font-medium">
          {selectedCount} {lineLabel} selected
        </span>

        <select
          aria-label="Move selected lines to category"
          defaultValue=""
          onChange={(event) => {
            const value = event.target.value as EstimateCategory;
            if (value) {
              onMoveToCategory(value);
              event.target.value = "";
            }
          }}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Move to category…
          </option>
          {ESTIMATE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {ESTIMATE_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>

        <select
          aria-label="Adjust unit cost for selected lines"
          defaultValue=""
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value !== 0) {
              onApplyMarkup(value);
              event.target.value = "";
            }
          }}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Adjust unit cost…
          </option>
          <option value="5">Increase by 5%</option>
          <option value="10">Increase by 10%</option>
          <option value="15">Increase by 15%</option>
          <option value="-5">Decrease by 5%</option>
          <option value="-10">Decrease by 10%</option>
        </select>

        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 data-icon="inline-start" />
          Delete lines
        </Button>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X data-icon="inline-start" />
          Clear selection
        </Button>
      </div>
    </div>
  );
}
