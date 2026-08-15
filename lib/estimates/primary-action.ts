import type { LucideIcon } from "lucide-react";
import { FileText, Layers, Sparkles } from "lucide-react";

import type { EstimateStatus } from "@/lib/estimates/types";

export type EstimatePrimaryActionKind =
  | "assemblies"
  | "copilot"
  | "review"
  | "finalize"
  | "proposal"
  | "reopen";

export type EstimatePrimaryAction = {
  label: string;
  kind: EstimatePrimaryActionKind;
  icon: LucideIcon;
  context: string;
};

type ResolveEstimatePrimaryActionInput = {
  status: EstimateStatus;
  hasLineItems: boolean;
  copilotEnabled: boolean;
};

/** Context-aware primary CTA for the estimate workspace. */
export function resolveEstimatePrimaryAction(
  input: ResolveEstimatePrimaryActionInput
): EstimatePrimaryAction {
  if (input.status === "Final") {
    return {
      label: "Add proposal",
      kind: "proposal",
      icon: FileText,
      context: "Turn this final estimate into a client-ready proposal.",
    };
  }

  if (!input.hasLineItems) {
    return {
      label: "Insert assembly",
      kind: "assemblies",
      icon: Layers,
      context: "Start with pre-built scope from your assemblies library.",
    };
  }

  if (input.copilotEnabled) {
    return {
      label: "Open Copilot",
      kind: "copilot",
      icon: Sparkles,
      context: "Get AI suggestions while you build pricing.",
    };
  }

  return {
    label: "Review with AI",
    kind: "review",
    icon: Sparkles,
    context: "Check margin, labor, and materials before marking final.",
  };
}

/** Secondary finalize action when primary is AI review. */
export function shouldShowFinalizeSecondary(input: {
  status: EstimateStatus;
  hasLineItems: boolean;
}): boolean {
  return input.status === "Draft" && input.hasLineItems;
}
