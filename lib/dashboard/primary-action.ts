import type { LucideIcon } from "lucide-react";
import {
  FileText,
  FolderKanban,
  PencilLine,
  Phone,
  UserPlus,
} from "lucide-react";

export type DashboardPrimaryAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  context: string;
};

type ResolvePrimaryActionInput = {
  isPortfolioEmpty: boolean;
  customerCount: number;
  projectCount: number;
  estimates: Array<{ id: string; status: string; updated_at: string }>;
  proposals: Array<{
    id: string;
    status: string;
    sent_at: string | null;
    title: string;
  }>;
};

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

/** Highest-priority next step for the contractor's current pipeline state. */
export function resolveDashboardPrimaryAction(
  input: ResolvePrimaryActionInput
): DashboardPrimaryAction {
  if (input.isPortfolioEmpty || input.customerCount === 0) {
    return {
      label: "Add your first customer",
      href: "/customers?action=add",
      icon: UserPlus,
      context: "Start by adding a customer to your directory.",
    };
  }

  if (input.projectCount === 0) {
    return {
      label: "Create a project",
      href: "/projects/new",
      icon: FolderKanban,
      context: "You have customers — create a project to begin estimating.",
    };
  }

  const followUpProposal = input.proposals
    .filter(
      (proposal) =>
        ["Sent", "Viewed"].includes(proposal.status) &&
        proposal.sent_at &&
        daysSince(proposal.sent_at) >= 3
    )
    .sort(
      (left, right) =>
        new Date(left.sent_at ?? 0).getTime() - new Date(right.sent_at ?? 0).getTime()
    )[0];

  if (followUpProposal) {
    return {
      label: "Follow up on proposal",
      href: `/proposals/${followUpProposal.id}`,
      icon: Phone,
      context: `"${followUpProposal.title}" was sent ${daysSince(followUpProposal.sent_at!)} days ago.`,
    };
  }

  const draftEstimate = input.estimates
    .filter((estimate) => estimate.status === "Draft")
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    )[0];

  if (draftEstimate) {
    return {
      label: "Continue estimate",
      href: `/estimates/${draftEstimate.id}`,
      icon: PencilLine,
      context: "Pick up where you left off on your latest draft.",
    };
  }

  const sentProposal = input.proposals.find((proposal) =>
    ["Sent", "Viewed"].includes(proposal.status)
  );

  if (sentProposal) {
    return {
      label: "Check proposal status",
      href: `/proposals/${sentProposal.id}`,
      icon: FileText,
      context: `"${sentProposal.title}" is awaiting a client response.`,
    };
  }

  return {
    label: "New estimate",
    href: "/projects?status=Estimating",
    icon: PencilLine,
    context: "Open a project in estimating to build pricing.",
  };
}
