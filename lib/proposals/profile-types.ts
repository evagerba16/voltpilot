import type { ProposalStatus, ProposalWithRelations } from "@/lib/proposals/types";

export type ProposalKpiSummary = {
  proposalValue: number;
  estimatedProfit: number;
  grossMarginPercent: number;
  status: ProposalStatus;
  createdDate: string;
  expirationDate: string | null;
};

export type ProposalActivityEventType =
  | "created"
  | "sent"
  | "viewed"
  | "comment"
  | "revision"
  | "accepted"
  | "declined"
  | "expired"
  | "signed"
  | "email";

export type ProposalActivityEvent = {
  id: string;
  type: ProposalActivityEventType;
  title: string;
  description: string;
  timestamp: string;
  actor: string;
};

export type ProposalDetailAnalytics = {
  viewCount: number;
  emailCount: number;
  revisionCount: number;
  daysSinceSent: number | null;
  daysToDecision: number | null;
  openRateLabel: string;
};

export type ProposalListMetrics = {
  estimatedProfit: number;
  grossMarginPercent: number;
  lastActivityAt: string | null;
  lastActivityLabel: string;
  customerInitials: string;
  needsFollowUp: boolean;
};

export type ProposalOrgAnalytics = {
  openRate: number;
  acceptanceRate: number;
  avgResponseDays: number;
  avgProposalValue: number;
  topProjectType: string | null;
  followUpCount: number;
};

export type ProposalInsightWithAction = {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  onActionField?: keyof ProposalWithRelations | "send" | "workflow";
};

export type ProposalProfile = {
  kpis: ProposalKpiSummary;
  analytics: ProposalDetailAnalytics;
  activity: ProposalActivityEvent[];
};

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function lastActivityLabel(timestamp: string | null) {
  if (!timestamp) {
    return "No activity yet";
  }

  const diff = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return "Active today";
  }

  if (days === 1) {
    return "Active yesterday";
  }

  return `${days} days ago`;
}
