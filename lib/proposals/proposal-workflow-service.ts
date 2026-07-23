import "server-only";

import { formatShortDate } from "@/lib/proposals/format";
import { getProposalById, verifyProposalOwnership } from "@/lib/proposals/queries";
import {
  getProposalEmailLog,
  getProposalRevisions,
  getProposalStatusHistory,
  getProposalViews,
} from "@/lib/proposals/revisions";
import type {
  Proposal,
  ProposalEmailLog,
  ProposalRevision,
  ProposalStatus,
  ProposalStatusHistoryEntry,
  ProposalViewRecord,
} from "@/lib/proposals/types";

export type ProposalTimelineEvent = {
  id: string;
  status: ProposalStatus | "Created";
  label: string;
  timestamp: string | null;
  description: string;
  completed: boolean;
};

export type ProposalWorkflowSnapshot = {
  proposal: Proposal;
  timeline: ProposalTimelineEvent[];
  statusHistory: ProposalStatusHistoryEntry[];
  views: ProposalViewRecord[];
  emails: ProposalEmailLog[];
  revisions: ProposalRevision[];
  stats: {
    viewCount: number;
    emailCount: number;
    revisionCount: number;
  };
};

const STATUS_ORDER: Array<ProposalStatus | "Created"> = [
  "Created",
  "Draft",
  "Sent",
  "Viewed",
  "Accepted",
  "Declined",
  "Expired",
];

function statusTimestamp(
  proposal: Proposal,
  status: ProposalStatus | "Created"
): string | null {
  switch (status) {
    case "Created":
      return proposal.created_at;
    case "Draft":
      return proposal.created_at;
    case "Sent":
      return proposal.sent_at;
    case "Viewed":
      return proposal.first_viewed_at ?? proposal.viewed_at;
    case "Accepted":
      return proposal.accepted_at ?? proposal.decided_at;
    case "Declined":
      return proposal.declined_at ?? proposal.decided_at;
    case "Expired":
      return proposal.expiration_date ?
          `${proposal.expiration_date}T23:59:59.000Z`
        : null;
  }
}

function statusDescription(
  status: ProposalStatus | "Created",
  proposal: Proposal
): string {
  switch (status) {
    case "Created":
      return "Proposal created in VoltPilot.";
    case "Draft":
      return "Saved and ready for your review before sending.";
    case "Sent":
      return proposal.last_emailed_at ?
          `Sent to customer${proposal.email_send_count > 1 ? ` (${proposal.email_send_count} emails)` : ""}.`
        : "Marked as sent to the customer.";
    case "Viewed":
      return "Customer opened the secure proposal link.";
    case "Accepted":
      return proposal.customer_signed_name ?
          `Signed by ${proposal.customer_signed_name}.`
        : "Customer accepted electronically.";
    case "Declined":
      return "Customer rejected the proposal.";
    case "Expired":
      return proposal.expiration_date ?
          `Expired on ${formatShortDate(proposal.expiration_date)}.`
        : "Proposal expired.";
  }
}

function statusRank(status: ProposalStatus | "Created") {
  return STATUS_ORDER.indexOf(status);
}

function isStatusCompleted(
  currentStatus: ProposalStatus,
  eventStatus: ProposalStatus | "Created"
) {
  const currentRank = Math.max(
    statusRank("Draft"),
    statusRank(currentStatus === "Draft" ? "Draft" : currentStatus)
  );
  return statusRank(eventStatus) <= currentRank;
}

export function buildProposalTimeline(proposal: Proposal): ProposalTimelineEvent[] {
  const events: ProposalTimelineEvent[] = [
    {
      id: "created",
      status: "Created",
      label: "Created",
      timestamp: statusTimestamp(proposal, "Created"),
      description: statusDescription("Created", proposal),
      completed: true,
    },
    {
      id: "draft",
      status: "Draft",
      label: "In progress",
      timestamp: statusTimestamp(proposal, "Draft"),
      description: statusDescription("Draft", proposal),
      completed: true,
    },
    {
      id: "sent",
      status: "Sent",
      label: "Sent",
      timestamp: statusTimestamp(proposal, "Sent"),
      description: statusDescription("Sent", proposal),
      completed: Boolean(proposal.sent_at) || isStatusCompleted(proposal.status, "Sent"),
    },
    {
      id: "viewed",
      status: "Viewed",
      label: "Viewed",
      timestamp: statusTimestamp(proposal, "Viewed"),
      description: statusDescription("Viewed", proposal),
      completed:
        Boolean(proposal.first_viewed_at) ||
        isStatusCompleted(proposal.status, "Viewed"),
    },
    {
      id: "accepted",
      status: "Accepted",
      label: "Accepted",
      timestamp: statusTimestamp(proposal, "Accepted"),
      description: statusDescription("Accepted", proposal),
      completed: proposal.status === "Accepted",
    },
    {
      id: "declined",
      status: "Declined",
      label: "Rejected",
      timestamp: statusTimestamp(proposal, "Declined"),
      description: statusDescription("Declined", proposal),
      completed: proposal.status === "Declined",
    },
    {
      id: "expired",
      status: "Expired",
      label: "Expired",
      timestamp: statusTimestamp(proposal, "Expired"),
      description: statusDescription("Expired", proposal),
      completed: proposal.status === "Expired",
    },
  ];

  if (proposal.status === "Accepted") {
    return events.filter((event) => event.id !== "declined" && event.id !== "expired");
  }

  if (proposal.status === "Declined") {
    return events.filter((event) => event.id !== "accepted" && event.id !== "expired");
  }

  if (proposal.status === "Expired") {
    return events.filter((event) => event.id !== "accepted" && event.id !== "declined");
  }

  return events.filter(
    (event) => !["accepted", "declined", "expired"].includes(event.id)
  );
}

export async function getProposalWorkflowSnapshot(
  proposalId: string,
  organizationId: string
): Promise<ProposalWorkflowSnapshot | null> {
  const ownsProposal = await verifyProposalOwnership(proposalId, organizationId);

  if (!ownsProposal) {
    return null;
  }

  const proposalRecord = await getProposalById(proposalId);

  if (!proposalRecord) {
    return null;
  }

  const proposal = proposalRecord as Proposal;
  const [statusHistory, views, emails, revisions] = await Promise.all([
    getProposalStatusHistory(proposalId),
    getProposalViews(proposalId),
    getProposalEmailLog(proposalId),
    getProposalRevisions(proposalId),
  ]);

  return {
    proposal,
    timeline: buildProposalTimeline(proposal),
    statusHistory,
    views,
    emails,
    revisions,
    stats: {
      viewCount: views.length,
      emailCount: emails.length,
      revisionCount: revisions.length,
    },
  };
}
