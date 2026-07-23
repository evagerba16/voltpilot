"use client";

import { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  buildStateFromTemplate,
  deleteEstimateTemplate,
  listEstimateTemplates,
  saveEstimateTemplate,
  type EstimateTemplate,
} from "@/lib/estimates/estimate-templates";
import type { EstimateBuilderState } from "@/lib/estimates/types";
import { cn } from "@/lib/utils";

type EstimateTemplatesDialogProps = {
  open: boolean;
  onClose: () => void;
  currentState: EstimateBuilderState;
  onApply: (nextState: EstimateBuilderState) => void;
};

export function EstimateTemplatesButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      <Bookmark className="size-3.5" />
      Templates
    </button>
  );
}

export function EstimateTemplatesDialog({
  open,
  onClose,
  currentState,
  onApply,
}: EstimateTemplatesDialogProps) {
  const [templates, setTemplates] = useState<EstimateTemplate[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (!open) {
      return;
    }

    setTemplates(listEstimateTemplates());
    setName("");
    setError(null);
  }, [open]);

  function refreshTemplates() {
    setTemplates(listEstimateTemplates());
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a template name.");
      return;
    }

    if (currentState.line_items.length === 0) {
      setError("Add at least one line item before saving a template.");
      return;
    }

    saveEstimateTemplate(trimmed, {
      overhead_percent: currentState.overhead_percent,
      contingency_percent: currentState.contingency_percent,
      profit_margin_percent: currentState.profit_margin_percent,
      tax_percent: currentState.tax_percent,
      line_items: currentState.line_items,
    });
    refreshTemplates();
    setName("");
    setError(null);
  }

  async function handleLoad(template: EstimateTemplate) {
    const confirmed = await confirm({
      title: `Load "${template.name}"?`,
      description:
        "This replaces your current line items and markup settings. Your estimate title and notes stay the same.",
      confirmLabel: "Load template",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    onApply(buildStateFromTemplate(currentState, template));
    onClose();
  }

  async function handleDelete(template: EstimateTemplate) {
    const confirmed = await confirm({
      title: `Delete "${template.name}"?`,
      description: "This removes the template from this device. This can't be undone.",
      confirmLabel: "Delete template",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    deleteEstimateTemplate(template.id);
    refreshTemplates();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Estimate templates"
      description="Save line item layouts you reuse often. Templates are stored on this device only."
      size="lg"
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="template-name" className="text-sm font-medium">
            Save current layout as template
          </label>
          <div className="flex gap-2">
            <input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Commercial rough-in"
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="button" onClick={handleSave}>
              Save template
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        {templates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No templates saved yet. Save a layout above to reuse it on future estimates.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.snapshot.line_items.length} line items ·{" "}
                    {new Date(template.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleLoad(template)}
                  >
                    Load
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(template)}
                    aria-label={`Delete ${template.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
