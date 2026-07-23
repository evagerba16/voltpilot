import {
  average,
  daysBetween,
  monthKey,
  monthLabel,
  safePercent,
} from "@/lib/analytics/time-buckets";
import type {
  AnalyticsDateRange,
  ProposalIntelligenceInput,
  ProposalIntelligenceRecord,
} from "@/lib/analytics/types";

export type ProposalIntelligenceSource = "rules" | "openai";

export type ProposalFollowUpItem = {
  id: string;
  title: string;
  projectName: string;
  customerName: string;
  amount: number;
  status: string;
  sentAt: string;
  daysSinceSent: number;
  needsFollowUp: boolean;
  href: string;
};

export type ProposalAcceptanceRatePoint = {
  period: string;
  label: string;
  acceptanceRate: number;
  decidedCount: number;
};

export type ProposalIntelligenceResult = {
  averageTimeToSendDays: number;
  averageTimeToAcceptanceDays: number;
  averageRevisionCount: number;
  acceptanceRateByMonth: ProposalAcceptanceRatePoint[];
  openProposalsAwaitingFollowUp: ProposalFollowUpItem[];
  openFollowUpCount: number;
  sentProposalCount: number;
  acceptedProposalCount: number;
  generatedAt: string;
  source: ProposalIntelligenceSource;
  methodology: string;
};

const OPEN_FOLLOW_UP_STATUSES = new Set(["Sent", "Viewed"]);

function buildMonthlyBuckets(dateRange: AnalyticsDateRange) {
  const now = new Date();
  const monthCount =
    dateRange === "7d"
      ? 3
      : dateRange === "30d"
        ? 6
        : dateRange === "90d"
          ? 6
          : dateRange === "ytd"
            ? now.getMonth() + 1
            : dateRange === "all"
              ? 24
              : 12;

  const buckets: Array<{ period: string; label: string }> = [];

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const period = monthKey(date);
    buckets.push({ period, label: monthLabel(period) });
  }

  return buckets;
}

function buildAverageTimeToSendDays(proposals: ProposalIntelligenceRecord[]) {
  const samples = proposals
    .filter((proposal) => proposal.sentAt)
    .map((proposal) => daysBetween(proposal.createdAt, proposal.sentAt!));

  return average(samples);
}

function buildAverageTimeToAcceptanceDays(proposals: ProposalIntelligenceRecord[]) {
  const samples = proposals
    .filter(
      (proposal) =>
        proposal.status === "Accepted" && proposal.sentAt && proposal.acceptedAt
    )
    .map((proposal) => daysBetween(proposal.sentAt!, proposal.acceptedAt!));

  return average(samples);
}

function buildAverageRevisionCount(proposals: ProposalIntelligenceRecord[]) {
  if (proposals.length === 0) {
    return 0;
  }

  const totalRevisions = proposals.reduce(
    (sum, proposal) => sum + proposal.revisionCount,
    0
  );

  return totalRevisions / proposals.length;
}

function buildAcceptanceRateByMonth(
  proposals: ProposalIntelligenceRecord[],
  dateRange: AnalyticsDateRange
) {
  const decided = proposals.filter((proposal) =>
    ["Accepted", "Declined"].includes(proposal.status)
  );
  const buckets = buildMonthlyBuckets(dateRange);
  const totals = new Map<string, { accepted: number; decided: number }>();

  for (const bucket of buckets) {
    totals.set(bucket.period, { accepted: 0, decided: 0 });
  }

  for (const proposal of decided) {
    const decisionDate = proposal.decidedAt ?? proposal.acceptedAt ?? proposal.updatedAt;
    const period = monthKey(new Date(decisionDate));
    const bucket = totals.get(period);

    if (!bucket) {
      continue;
    }

    bucket.decided += 1;
    if (proposal.status === "Accepted") {
      bucket.accepted += 1;
    }
  }

  return buckets.map((bucket) => {
    const entry = totals.get(bucket.period) ?? { accepted: 0, decided: 0 };
    return {
      period: bucket.period,
      label: bucket.label,
      acceptanceRate: safePercent(entry.accepted, entry.decided),
      decidedCount: entry.decided,
    };
  });
}

function buildOpenProposalsAwaitingFollowUp(
  proposals: ProposalIntelligenceRecord[],
  followUpDaysThreshold: number
) {
  const nowIso = new Date().toISOString();

  return proposals
    .filter((proposal) => OPEN_FOLLOW_UP_STATUSES.has(proposal.status))
    .map((proposal) => {
      const sentAt = proposal.sentAt ?? proposal.updatedAt;
      const daysSinceSent = daysBetween(sentAt, nowIso);

      return {
        id: proposal.id,
        title: proposal.title,
        projectName: proposal.projectName,
        customerName: proposal.customerName,
        amount: proposal.amount,
        status: proposal.status,
        sentAt,
        daysSinceSent,
        needsFollowUp: daysSinceSent >= followUpDaysThreshold,
        href: `/proposals/${proposal.id}`,
      };
    })
    .sort((a, b) => b.daysSinceSent - a.daysSinceSent);
}

/**
 * Rule-based proposal intelligence from workflow timestamps and revisions.
 * Swap the implementation to call OpenAI later without changing consumers.
 */
export function generateProposalIntelligence(
  input: ProposalIntelligenceInput,
  generatedAt: string,
  source: ProposalIntelligenceSource = "rules"
): ProposalIntelligenceResult {
  const openProposalsAwaitingFollowUp = buildOpenProposalsAwaitingFollowUp(
    input.proposals,
    input.followUpDaysThreshold
  );

  return {
    averageTimeToSendDays: buildAverageTimeToSendDays(input.proposals),
    averageTimeToAcceptanceDays: buildAverageTimeToAcceptanceDays(input.proposals),
    averageRevisionCount: buildAverageRevisionCount(input.proposals),
    acceptanceRateByMonth: buildAcceptanceRateByMonth(
      input.proposals,
      input.dateRange
    ),
    openProposalsAwaitingFollowUp,
    openFollowUpCount: openProposalsAwaitingFollowUp.length,
    sentProposalCount: input.proposals.filter((proposal) => proposal.sentAt).length,
    acceptedProposalCount: input.proposals.filter(
      (proposal) => proposal.status === "Accepted"
    ).length,
    generatedAt,
    source,
    methodology:
      "Calculated from proposal created/sent/accepted timestamps, revision history, and monthly decision outcomes.",
  };
}

/** Future OpenAI upgrade path — same signature, different implementation. */
export async function generateProposalIntelligenceAsync(
  input: ProposalIntelligenceInput,
  generatedAt: string
): Promise<ProposalIntelligenceResult> {
  return generateProposalIntelligence(input, generatedAt, "rules");
}
