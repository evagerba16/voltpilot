import { reviewProposal } from "@/lib/ai/proposal-review";
import type { ProposalDetailAnalytics, ProposalInsightWithAction } from "@/lib/proposals/profile-types";
import { mapProposalToEditorState } from "@/lib/proposals/build-from-estimate";
import type { ProposalEditorState, ProposalWithRelations } from "@/lib/proposals/types";

export function buildProposalInsights({
  proposal,
  analytics,
  editorState,
}: {
  proposal: ProposalWithRelations;
  analytics: ProposalDetailAnalytics;
  editorState?: ProposalEditorState;
}): ProposalInsightWithAction[] {
  const insights: ProposalInsightWithAction[] = [];
  const state = editorState ?? mapProposalToEditorState(proposal);
  const review = reviewProposal(state);
  const href = `/proposals/${proposal.id}`;

  if (proposal.status === "Sent" && analytics.viewCount === 0) {
    insights.push({
      id: "not-opened",
      severity: "warning",
      category: "Follow-up",
      title: "Customer hasn't opened yet",
      description: `Sent ${analytics.daysSinceSent ?? 0} day(s) ago with no portal views — send a reminder or call ${proposal.project.customer.contact_name}.`,
      actionLabel: "Send follow-up",
      onActionField: "send",
    });
  }

  if (proposal.status === "Viewed" && !proposal.accepted_at && !proposal.declined_at) {
    insights.push({
      id: "viewed-no-decision",
      severity: "info",
      category: "Follow-up",
      title: "Viewed but no decision",
      description: "Customer opened the proposal — schedule a follow-up while scope is fresh.",
      actionLabel: "Open workflow",
      onActionField: "workflow",
    });
  }

  if (
    analytics.daysSinceSent !== null &&
    analytics.daysSinceSent >= 7 &&
    ["Sent", "Viewed"].includes(proposal.status)
  ) {
    insights.push({
      id: "stale-proposal",
      severity: "critical",
      category: "Risk",
      title: "Proposal going stale",
      description: `${analytics.daysSinceSent} days since send with no acceptance — confirm scope, pricing, or expiration date.`,
      href,
      actionLabel: "Review proposal",
    });
  }

  const snapshot = proposal.estimate_snapshot;
  if (snapshot && snapshot.gross_margin_percent > 0 && snapshot.gross_margin_percent < 12) {
    insights.push({
      id: "thin-margin",
      severity: "warning",
      category: "Pricing",
      title: "Thin margin on this bid",
      description: `${snapshot.gross_margin_percent.toFixed(1)}% gross margin leaves little room for field variance — review markup before sending revisions.`,
      href,
      actionLabel: "Review pricing",
    });
  }

  if (!state.warranty_information.trim()) {
    insights.push({
      id: "missing-warranty",
      severity: "warning",
      category: "Missing info",
      title: "Warranty section missing",
      description: "Electrical customers expect workmanship warranty terms — add coverage duration and response time.",
      href,
      actionLabel: "Add warranty",
    });
  }

  if (!state.terms_and_conditions.trim()) {
    insights.push({
      id: "missing-terms",
      severity: "warning",
      category: "Missing info",
      title: "Terms & conditions empty",
      description: "Payment terms, change order policy, and permit responsibilities reduce disputes after award.",
      href,
      actionLabel: "Add terms",
    });
  }

  if (review.score < 80) {
    insights.push({
      id: "readiness",
      severity: review.readyToSend ? "info" : "warning",
      category: "Acceptance rate",
      title: review.readyToSend ? "Good send readiness" : "Improve before sending",
      description: review.summary,
      href,
      actionLabel: "View suggestions",
    });
  } else {
    insights.push({
      id: "strong-readiness",
      severity: "info",
      category: "Acceptance rate",
      title: "Strong proposal readiness",
      description: review.summary,
      href,
      actionLabel: "Review content",
    });
  }

  if (proposal.expiration_date) {
    const daysToExpire = Math.ceil(
      (new Date(`${proposal.expiration_date}T23:59:59`).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysToExpire <= 3 && daysToExpire >= 0 && !["Accepted", "Declined", "Expired"].includes(proposal.status)) {
      insights.push({
        id: "expiring-soon",
        severity: "warning",
        category: "Follow-up",
        title: "Expiration approaching",
        description: `Proposal expires in ${daysToExpire} day(s) — nudge the customer or extend the date.`,
        href,
        actionLabel: "Update expiration",
      });
    }
  }

  for (const suggestion of review.suggestions.slice(0, 2)) {
    insights.push({
      id: `review-${suggestion.id}`,
      severity: suggestion.kind === "warning" ? "warning" : "info",
      category: "Acceptance rate",
      title: suggestion.message,
      description: `Readiness score impact: -${suggestion.pointsDeducted} points.`,
      href,
      actionLabel: suggestion.field ? "Fix section" : "Review",
    });
  }

  return insights.slice(0, 8);
}
