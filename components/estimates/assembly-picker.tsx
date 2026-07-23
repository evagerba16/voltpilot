"use client";

import { useState } from "react";
import { Layers, Plus } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  ELECTRICAL_ASSEMBLIES,
  type EstimateAssembly,
} from "@/lib/estimates/assemblies";
import { formatCurrency } from "@/lib/estimates/calculations";
import { cn } from "@/lib/utils";

type AssemblyPickerProps = {
  onInsert: (assembly: EstimateAssembly) => void;
};

function assemblyDirectCost(assembly: EstimateAssembly) {
  return assembly.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );
}

export function AssemblyPicker({ onInsert }: AssemblyPickerProps) {
  const [open, setOpen] = useState(false);

  function handleInsert(assembly: EstimateAssembly) {
    onInsert(assembly);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Layers className="size-3.5" />
        Insert assembly
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Insert assembly"
        description="Add a pre-built bundle of labor and material lines."
        size="lg"
      >
        <div className="space-y-2">
          {ELECTRICAL_ASSEMBLIES.map((assembly) => (
            <div
              key={assembly.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{assembly.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {assembly.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {assembly.items.length} lines · est. direct cost{" "}
                  {formatCurrency(assemblyDirectCost(assembly))}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleInsert(assembly)}
              >
                <Plus data-icon="inline-start" />
                Insert
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
