import "server-only";

import { buildProposalActivityFeed } from "@/lib/proposals/activity";
import type {
  ProposalDetailAnalytics,
  ProposalKpiSummary,
  ProposalListMetrics,
  ProposalOrgAnalytics,
  ProposalProfile,
} from "@/lib/proposals/profile-types";
import { initialsFromName, lastActivityLabel } from "@/lib/proposals/profile-types";
import { parseNumber } from "@/lib/proposals/format";
import {
  getProposalComments,
  getProposalEmailLog,
  getProposalRevisions,
  getProposalStatusHistory,
  getProposalViews,
} from "@/lib/proposals/revisions";
import type {
  ProposalEstimateSnapshot,
  ProposalListItem,
  ProposalWithRelations,
} from "@/lib/proposals/types";

function snapshotMetrics(snapshot: ProposalEstimateSnapshot | null) {
  return {
    estimatedProfit: snapshot?.profit_amount ?? 0,
    grossMarginPercent: snapshot?.gross_margin_percent ?? 0,
  };
}

function latestTimestamp(values: Array<string | null | undefined>) {
  const valid = values.filter(Boolean) as string[];

  if (valid.length === 0) {
    return null;
  }

  return valid.sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )[0];
}

function daysBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function buildProposalKpis(proposal: ProposalWithRelations): ProposalKpiSummary {
  const metrics = snapshotMetrics(proposal.estimate_snapshot);

  return {
    proposalValue: proposal.amount,
    estimatedProfit: metrics.estimatedProfit,
    grossMarginPercent: metrics.grossMarginPercent,
    status: proposal.status,
    createdDate: proposal.created_at,
    expirationDate: proposal.expiration_date,
  };
}

export function buildProposalDetailAnalytics(
  proposal: ProposalWithRelations,
  viewCount: number,
  emailCount: number,
  revisionCount: number
): ProposalDetailAnalytics {
  const daysSinceSent = proposal.sent_at
    ? daysBetween(proposal.sent_at, new Date().toISOString())
    : null;

  const decisionAt = proposal.accepted_at ?? proposal.declined_at;
  const daysToDecision =
    proposal.sent_at && decisionAt ? daysBetween(proposal.sent_at, decisionAt) : null;

  let openRateLabel = "Not sent yet";
  if (proposal.sent_at) {
    openRateLabel =
      viewCount > 0 || proposal.first_viewed_at
        ? "Customer opened proposal"
        : "Awaiting first view";
  }

  return {
    viewCount,
    emailCount,
    revisionCount,
    daysSinceSent,
    daysToDecision,
    openRateLabel,
  };
}

export async function getProposalProfile(
  proposal: ProposalWithRelations
): Promise<ProposalProfile> {
  const [comments, revisions, views, emails, statusHistory] = await Promise.all([
    getProposalComments(proposal.id),
    getProposalRevisions(proposal.id),
    getProposalViews(proposal.id),
    getProposalEmailLog(proposal.id),
    getProposalStatusHistory(proposal.id),
  ]);

  const activity = buildProposalActivityFeed({
    proposal,
    comments,
    revisions,
    views,
    emails,
    statusHistory,
  });

  return {
    kpis: buildProposalKpis(proposal),
    analytics: buildProposalDetailAnalytics(
      proposal,
      views.length,
      emails.length,
      revisions.length
    ),
    activity,
  };
}

export function buildProposalListMetrics(
  proposal: ProposalListItem
): ProposalListMetrics {
  const metrics = snapshotMetrics(proposal.estimate_snapshot);
  const lastActivityAt = latestTimestamp([
    proposal.updated_at,
    proposal.sent_at,
    proposal.first_viewed_at,
    proposal.viewed_at,
    proposal.accepted_at,
    proposal.declined_at,
    proposal.last_emailed_at,
  ]);

  const daysSinceSent = proposal.sent_at
    ? daysBetween(proposal.sent_at, new Date().toISOString())
    : null;

  return {
    estimatedProfit: metrics.estimatedProfit,
    grossMarginPercent: metrics.grossMarginPercent,
    lastActivityAt,
    lastActivityLabel: lastActivityLabel(lastActivityAt),
    customerInitials: initialsFromName(
      proposal.project.customer.contact_name ?? proposal.project.customer.company_name
    ),
    needsFollowUp:
      ["Sent", "Viewed"].includes(proposal.status) &&
      daysSinceSent !== null &&
      daysSinceSent >= 3,
  };
}

export function buildProposalOrgAnalytics(
  proposals: Array<{
    status: string;
    amount: number;
    sent_at: string | null;
    first_viewed_at: string | null;
    accepted_at: string | null;
    declined_at: string | null;
    project?: { project_type?: string | null };
  }>
): ProposalOrgAnalytics {
  const sent = proposals.filter((item) => item.sent_at);
  const viewed = sent.filter((item) => item.first_viewed_at);
  const decided = proposals.filter((item) =>
    ["Accepted", "Declined"].includes(item.status)
  );
  const accepted = proposals.filter((item) => item.status === "Accepted");
  const followUp = proposals.filter(
    (item) =>
      ["Sent", "Viewed"].includes(item.status) &&
      item.sent_at &&
      daysBetween(item.sent_at, new Date().toISOString()) >= 3
  );

  const responseSamples = accepted
    .filter((item) => item.sent_at && item.accepted_at)
    .map((item) => daysBetween(item.sent_at!, item.accepted_at!));

  const avgResponseDays =
    responseSamples.length > 0
      ? responseSamples.reduce((sum, value) => sum + value, 0) / responseSamples.length
      : 0;

  const avgProposalValue =
    proposals.length > 0
      ? proposals.reduce((sum, item) => sum + parseNumber(item.amount), 0) /
        proposals.length
      : 0;

  const typeWins = new Map<string, number>();
  for (const proposal of accepted) {
    const type = proposal.project?.project_type ?? "General";
    typeWins.set(type, (typeWins.get(type) ?? 0) + 1);
  }

  const topProjectType =
    [...typeWins.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    openRate: sent.length > 0 ? (viewed.length / sent.length) * 100 : 0,
    acceptanceRate:
      decided.length > 0 ? (accepted.length / decided.length) * 100 : 0,
    avgResponseDays,
    avgProposalValue,
    topProjectType,
    followUpCount: followUp.length,
  };
}
