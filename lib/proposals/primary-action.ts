import type { LucideIcon } from "lucide-react";
import { Eye, HardHat, RefreshCw, Send } from "lucide-react";

import type { ProposalStatus } from "@/lib/proposals/types";

export type ProposalPrimaryActionKind =
  | "send"
  | "follow_up"
  | "manage_job"
  | "preview"
  | "workflow";

export type ProposalPrimaryAction = {
  label: string;
  kind: ProposalPrimaryActionKind;
  icon: LucideIcon;
  context: string;
};

type ResolveProposalPrimaryActionInput = {
  status: ProposalStatus;
  canEdit: boolean;
  readyToSend: boolean;
};

/** Context-aware primary CTA for the proposal workspace. */
export function resolveProposalPrimaryAction(
  input: ResolveProposalPrimaryActionInput
): ProposalPrimaryAction {
  if (input.status === "Accepted") {
    return {
      label: "Start Job Costing",
      kind: "manage_job",
      icon: HardHat,
      context: "Customer accepted — track costs and run this job.",
    };
  }

  if (input.status === "Declined" || input.status === "Expired") {
    return {
      label: "Open workflow",
      kind: "workflow",
      icon: RefreshCw,
      context: "Review the outcome and decide whether to revise or close out.",
    };
  }

  if (input.status === "Sent" || input.status === "Viewed") {
    return {
      label: "Follow up",
      kind: "follow_up",
      icon: Send,
      context: "Customer has this proposal — send a reminder or check status.",
    };
  }

  if (input.canEdit && input.readyToSend) {
    return {
      label: "Send to customer",
      kind: "send",
      icon: Send,
      context: "Proposal looks ready — send a professional bid.",
    };
  }

  return {
    label: "Preview proposal",
    kind: "preview",
    icon: Eye,
    context: input.canEdit
      ? "Review the customer-facing preview before sending."
      : "View the proposal as your customer sees it.",
  };
}
