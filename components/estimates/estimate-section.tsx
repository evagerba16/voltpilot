"use client";

import { memo, useState } from "react";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";

import { MaterialPicker } from "@/components/estimates/material-picker";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  calculateCategoryTotal,
  calculateLineTotal,
  formatCurrency,
} from "@/lib/estimates/calculations";
import { getLineItemLocalId } from "@/lib/estimates/line-item-utils";
import {
  type EstimateCategory,
  type EstimateLineItemInput,
} from "@/lib/estimates/types";
import { getUnitOptionsForCategory } from "@/lib/estimates/units";
import { cn } from "@/lib/utils";

type EstimateSectionProps = {
  category: EstimateCategory;
  label: string;
  items: EstimateLineItemInput[];
  materialProjectType?: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (localId: string) => void;
  onToggleSelectAll: (localIds: string[], selected: boolean) => void;
  onAddRow: () => void;
  onUpdateRow: (
    localId: string,
    field: keyof EstimateLineItemInput,
    value: string | number
  ) => void;
  onDuplicateRow: (localId: string) => void;
  onRemoveRow: (localId: string) => void;
  onReorderRows: (fromIndex: number, toIndex: number) => void;
};

const cellInputClassName =
  "h-8 w-full border-0 bg-transparent px-2 text-sm outline-none focus:bg-background focus:ring-1 focus:ring-ring/50";

const numberInputClassName = cn(
  cellInputClassName,
  "text-right tabular-nums"
);

const DECIMAL_INPUT_PATTERN = /^\d*\.?\d*$/;

function parseDecimalInput(raw: string): number {
  const trimmed = raw.trim();

  if (trimmed === "" || trimmed === ".") {
    return 0;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatDecimalDisplay(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  return String(value);
}

function DecimalCellInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const isEditing = draft !== null;

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isEditing ? draft : formatDecimalDisplay(value)}
      onFocus={() => {
        setDraft(value === 0 ? "" : formatDecimalDisplay(value));
      }}
      onBlur={() => {
        onChange(parseDecimalInput(draft ?? ""));
        setDraft(null);
      }}
      onChange={(event) => {
        const next = event.target.value;

        if (next !== "" && !DECIMAL_INPUT_PATTERN.test(next)) {
          return;
        }

        setDraft(next);
        onChange(parseDecimalInput(next));
      }}
      className={className}
    />
  );
}

export const EstimateSection = memo(EstimateSectionComponent);

function EstimateSectionComponent({
  category,
  label,
  items,
  materialProjectType,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onAddRow,
  onUpdateRow,
  onDuplicateRow,
  onRemoveRow,
  onReorderRows,
}: EstimateSectionProps) {
  const sectionTotal = calculateCategoryTotal(items);
  const localIds = items.map((item, index) => getLineItemLocalId(item, index));
  const allSelected =
    localIds.length > 0 && localIds.every((id) => selectedIds.has(id));
  const someSelected = localIds.some((id) => selectedIds.has(id));
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  function handleDragStart(index: number, event: React.DragEvent) {
    setDraggingIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleDrop(targetIndex: number, event: React.DragEvent) {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer.getData("text/plain"));

    if (!Number.isFinite(fromIndex) || fromIndex === targetIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }

    onReorderRows(fromIndex, targetIndex);
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            {label}
          </h3>
          <p className="text-xs text-muted-foreground">
            {items.length} line{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddRow}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Plus className="size-3.5" />
          Add line
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-8 px-1 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(node) => {
                    if (node) {
                      node.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={() =>
                    onToggleSelectAll(localIds, !allSelected)
                  }
                  aria-label={`Select all ${label.toLowerCase()} lines`}
                  className="size-3.5 rounded border-input accent-primary"
                />
              </th>
              <th className="w-8 px-1 py-2" aria-label="Reorder" />
              <th className="w-[30%] px-2 py-2 text-left font-medium">
                Description
              </th>
              <th className="w-[10%] px-2 py-2 text-right font-medium">Qty</th>
              <th className="w-[10%] px-2 py-2 text-left font-medium">Unit</th>
              <th className="w-[14%] px-2 py-2 text-right font-medium">
                Unit cost
              </th>
              <th className="w-[14%] px-2 py-2 text-right font-medium">
                Total
              </th>
              <th className="w-[12%] px-2 py-2 text-center font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr className="border-b border-border/60">
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  No {label.toLowerCase()} lines yet. Click &quot;Add line&quot; to get started.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const localId = getLineItemLocalId(item, index);
                const lineTotal = calculateLineTotal(
                  item.quantity,
                  item.unit_cost
                );
                const isSelected = selectedIds.has(localId);
                const isDragging = draggingIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <tr
                    key={localId}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverIndex(index);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === index) {
                        setDragOverIndex(null);
                      }
                    }}
                    onDrop={(event) => handleDrop(index, event)}
                    className={cn(
                      "border-b border-border/60 transition-colors hover:bg-muted/10",
                      isSelected && "bg-primary/5",
                      isDragging && "opacity-50",
                      isDragOver && "ring-2 ring-inset ring-primary/40"
                    )}
                  >
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(localId)}
                        aria-label={`Select ${item.description || "line"}`}
                        className="size-3.5 rounded border-input accent-primary"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => handleDragStart(index, event)}
                        onDragEnd={() => {
                          setDraggingIndex(null);
                          setDragOverIndex(null);
                        }}
                        className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                        aria-label="Drag to reorder"
                      >
                        <GripVertical className="size-3.5" />
                      </button>
                    </td>
                    <td className="border-r border-border/40 p-0">
                      {category === "materials" ? (
                        <MaterialPicker
                          value={item.description}
                          projectType={materialProjectType}
                          onChange={({ description, defaultUnit }) => {
                            onUpdateRow(localId, "description", description);
                            if (defaultUnit) {
                              onUpdateRow(localId, "unit", defaultUnit);
                            }
                          }}
                        />
                      ) : (
                        <input
                          value={item.description}
                          onChange={(event) =>
                            onUpdateRow(
                              localId,
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Describe the work or material"
                          className={cellInputClassName}
                        />
                      )}
                    </td>
                    <td className="border-r border-border/40 p-0">
                      <DecimalCellInput
                        value={item.quantity}
                        onChange={(nextValue) =>
                          onUpdateRow(localId, "quantity", nextValue)
                        }
                        className={numberInputClassName}
                      />
                    </td>
                    <td className="border-r border-border/40 p-0">
                      <input
                        list={`units-${category}`}
                        value={item.unit}
                        onChange={(event) =>
                          onUpdateRow(localId, "unit", event.target.value)
                        }
                        className={cellInputClassName}
                      />
                      <datalist id={`units-${category}`}>
                        {getUnitOptionsForCategory(category).map((unit) => (
                          <option key={unit} value={unit} />
                        ))}
                      </datalist>
                    </td>
                    <td className="border-r border-border/40 p-0">
                      <DecimalCellInput
                        value={item.unit_cost}
                        onChange={(nextValue) =>
                          onUpdateRow(localId, "unit_cost", nextValue)
                        }
                        className={numberInputClassName}
                      />
                    </td>
                    <td className="border-r border-border/40 px-2 py-2 text-right font-medium tabular-nums">
                      {formatCurrency(lineTotal)}
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onDuplicateRow(localId)}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                            "text-muted-foreground hover:text-foreground"
                          )}
                          aria-label="Duplicate line"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveRow(localId)}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                            "text-muted-foreground hover:text-destructive"
                          )}
                          aria-label="Remove line"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td
                colSpan={6}
                className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {label} subtotal
              </td>
              <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums">
                {formatCurrency(sectionTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
