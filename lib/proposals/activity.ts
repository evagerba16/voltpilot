import type { ProposalActivityEvent } from "@/lib/proposals/profile-types";
import type {
  ProposalPortalComment,
  ProposalRevision,
  ProposalStatusHistoryEntry,
  ProposalViewRecord,
  ProposalWithRelations,
} from "@/lib/proposals/types";
import type { ProposalEmailLog } from "@/lib/proposals/types";

export function buildProposalActivityFeed({
  proposal,
  comments,
  revisions,
  views,
  emails,
  statusHistory,
}: {
  proposal: ProposalWithRelations;
  comments: ProposalPortalComment[];
  revisions: ProposalRevision[];
  views: ProposalViewRecord[];
  emails: ProposalEmailLog[];
  statusHistory: ProposalStatusHistoryEntry[];
}): ProposalActivityEvent[] {
  const events: ProposalActivityEvent[] = [];

  events.push({
    id: "created",
    type: "created",
    title: "Proposal created",
    description: `${proposal.title} was created for ${proposal.project.customer.company_name}.`,
    timestamp: proposal.created_at,
    actor: "Your team",
  });

  for (const email of emails) {
    events.push({
      id: `email-${email.id}`,
      type: "email",
      title: "Proposal emailed",
      description: `Sent to ${email.recipient_email} — ${email.subject}`,
      timestamp: email.sent_at,
      actor: "Your team",
    });
  }

  if (proposal.sent_at) {
    events.push({
      id: "sent",
      type: "sent",
      title: "Proposal sent",
      description: `Marked as sent to ${proposal.project.customer.contact_name}.`,
      timestamp: proposal.sent_at,
      actor: "Your team",
    });
  }

  for (const view of views) {
    events.push({
      id: `view-${view.id}`,
      type: "viewed",
      title: "Customer viewed proposal",
      description: view.viewer_ip
        ? `Opened from ${view.viewer_ip}`
        : "Customer opened the secure proposal link.",
      timestamp: view.viewed_at,
      actor: proposal.project.customer.contact_name,
    });
  }

  for (const comment of comments) {
    events.push({
      id: `comment-${comment.id}`,
      type: "comment",
      title: "Customer comment",
      description: comment.body,
      timestamp: comment.created_at,
      actor: comment.author_name,
    });
  }

  for (const revision of revisions) {
    events.push({
      id: `revision-${revision.id}`,
      type: "revision",
      title: `Revision ${revision.version_number}`,
      description: revision.label || "Proposal content updated.",
      timestamp: revision.created_at,
      actor: "Your team",
    });
  }

  for (const entry of statusHistory) {
    events.push({
      id: `status-${entry.id}`,
      type: entry.new_status === "Accepted" ? "accepted" : entry.new_status === "Declined" ? "declined" : "sent",
      title: `Status changed to ${entry.new_status}`,
      description: entry.note ?? `Updated from ${entry.previous_status ?? "unknown"}.`,
      timestamp: entry.created_at,
      actor: "System",
    });
  }

  if (proposal.customer_signed_at && proposal.customer_signed_name) {
    events.push({
      id: "signed",
      type: "signed",
      title: "Customer signed",
      description: `Electronically signed by ${proposal.customer_signed_name}.`,
      timestamp: proposal.customer_signed_at,
      actor: proposal.customer_signed_name,
    });
  }

  if (proposal.accepted_at) {
    events.push({
      id: "accepted",
      type: "accepted",
      title: "Proposal accepted",
      description: proposal.customer_signed_name
        ? `${proposal.customer_signed_name} accepted this proposal.`
        : "Customer accepted this proposal.",
      timestamp: proposal.accepted_at,
      actor: proposal.project.customer.contact_name,
    });
  }

  if (proposal.declined_at) {
    events.push({
      id: "declined",
      type: "declined",
      title: "Proposal declined",
      description: "Customer rejected this proposal.",
      timestamp: proposal.declined_at,
      actor: proposal.project.customer.contact_name,
    });
  }

  if (proposal.status === "Expired" && proposal.expiration_date) {
    events.push({
      id: "expired",
      type: "expired",
      title: "Proposal expired",
      description: `Valid through ${proposal.expiration_date}.`,
      timestamp: `${proposal.expiration_date}T23:59:59.000Z`,
      actor: "System",
    });
  }

  const deduped = new Map<string, ProposalActivityEvent>();

  for (const event of events) {
    deduped.set(event.id, event);
  }

  return [...deduped.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
