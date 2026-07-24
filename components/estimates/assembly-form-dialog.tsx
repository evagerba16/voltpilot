"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LineItemPicker } from "@/components/estimates/line-item-picker";
import { isPickerCategory } from "@/lib/estimates/line-item-catalogs";
import type {
  AssemblyLineItemTemplate,
  EstimateAssembly,
} from "@/lib/estimates/assembly-catalogs/types";
import type { EstimateCategory } from "@/lib/estimates/types";
import { ESTIMATE_CATEGORIES, ESTIMATE_CATEGORY_LABELS } from "@/lib/estimates/types";
import { getDefaultUnitForCategory } from "@/lib/estimates/units";
import { saveCompanyAssembly } from "@/lib/estimates/assembly-catalogs/company-assemblies";
import { normalizeUnitForCategory } from "@/lib/estimates/units";

type AssemblyFormDialogProps = {
  open: boolean;
  assembly: EstimateAssembly | null;
  onClose: () => void;
  onSaved: (assemblyId: string) => void;
};

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AssemblyFormDialog({
  open,
  assembly,
  onClose,
  onSaved,
}: AssemblyFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<AssemblyLineItemTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open && assembly) {
      setName(assembly.name);
      setDescription(assembly.description);
      setItems(assembly.items.map((item) => ({ ...item })));
      setError(null);
    }
  }, [open, assembly]);

  function updateItem(index: number, patch: Partial<AssemblyLineItemTemplate>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function addItem(category: EstimateCategory) {
    setItems((current) => [
      ...current,
      {
        category,
        description: "",
        quantity: 1,
        unit: getDefaultUnitForCategory(category),
        unit_cost: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleSave() {
    if (!assembly) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Assembly name is required.");
      return;
    }

    if (items.length === 0) {
      setError("Add at least one line item.");
      return;
    }

    if (items.some((item) => !item.description.trim())) {
      setError("Every line item needs a description.");
      return;
    }

    startTransition(() => {
      const saved = saveCompanyAssembly({
        ...assembly,
        name: trimmedName,
        description: description.trim() || trimmedName,
        category: "company",
        isCompany: true,
        items: items.map((item) => ({
          ...item,
          description: item.description.trim(),
        })),
      });
      onSaved(saved.id);
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assembly?.name ? "Edit company assembly" : "New company assembly"}
      description="Build a reusable bundle of labor, materials, equipment, and subcontractor lines."
      size="lg"
    >
      <div className="space-y-4">
        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="assembly-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="assembly-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder="Install Duplex Outlet"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="assembly-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="assembly-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Optional summary for your team"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Line items</p>
            <div className="flex flex-wrap gap-1">
              {ESTIMATE_CATEGORIES.filter((category) => category !== "miscellaneous").map(
                (category) => (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addItem(category)}
                  >
                    <Plus data-icon="inline-start" />
                    {ESTIMATE_CATEGORY_LABELS[category]}
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Add labor, materials, equipment, or subcontractor lines.
              </p>
            ) : (
              items.map((item, index) => (
                <div
                  key={`${item.category}-${index}`}
                  className="grid gap-2 rounded-lg border border-border/70 bg-muted/10 p-3 sm:grid-cols-[1fr_80px_80px_90px_auto]"
                >
                  {isPickerCategory(item.category) ? (
                    <LineItemPicker
                      category={item.category}
                      value={item.description}
                      onChange={({ description, defaultUnit, defaultUnitCost }) => {
                        updateItem(index, {
                          description,
                          ...(defaultUnit
                            ? {
                                unit: normalizeUnitForCategory(item.category, defaultUnit),
                              }
                            : {}),
                          ...(defaultUnitCost != null &&
                          defaultUnitCost > 0 &&
                          item.unit_cost === 0
                            ? { unit_cost: defaultUnitCost }
                            : {}),
                          ...(defaultUnitCost != null &&
                          defaultUnitCost > 0 &&
                          item.quantity === 0
                            ? { quantity: 1 }
                            : {}),
                        });
                      }}
                    />
                  ) : (
                    <input
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, { description: event.target.value })
                      }
                      placeholder="Description"
                      className={inputClassName}
                    />
                  )}
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, { quantity: Number(event.target.value) || 0 })
                    }
                    className={inputClassName}
                    aria-label="Quantity"
                  />
                  <input
                    value={item.unit ?? ""}
                    onChange={(event) => updateItem(index, { unit: event.target.value })}
                    className={inputClassName}
                    aria-label="Unit"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_cost}
                    onChange={(event) =>
                      updateItem(index, { unit_cost: Number(event.target.value) || 0 })
                    }
                    className={inputClassName}
                    aria-label="Unit cost"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={handleSave}>
            {pending ? "Saving…" : "Save assembly"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
