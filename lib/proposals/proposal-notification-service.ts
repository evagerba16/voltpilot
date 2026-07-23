import "server-only";

import { sendProposalNotificationEmail } from "@/lib/email/proposal-notifications";
import { formatCurrency } from "@/lib/proposals/format";
import type { ProposalPortalData } from "@/lib/proposals/types";

export type ProposalNotificationEvent =
  | "viewed"
  | "accepted"
  | "rejected"
  | "commented";

type ProposalNotificationContext = {
  proposal: ProposalPortalData;
  dashboardUrl: string;
  comment?: string;
};

function getContractorEmail(proposal: ProposalPortalData) {
  return proposal.company_snapshot?.email?.trim() ?? null;
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

function buildNotificationCopy(
  event: ProposalNotificationEvent,
  context: ProposalNotificationContext
) {
  const { proposal } = context;
  const customerName = proposal.customer.contact_name;
  const customerCompany = proposal.customer.company_name;
  const proposalLabel = proposal.proposal_number ?? proposal.title;
  const amountLabel = formatCurrency(proposal.amount);
  const companyName = proposal.company_snapshot?.company_name ?? "Your company";

  switch (event) {
    case "viewed":
      return {
        subject: `${customerCompany} viewed proposal ${proposalLabel}`,
        headline: "Your proposal was viewed",
        body: [
          `${customerName} at ${customerCompany} opened proposal ${proposalLabel} for ${amountLabel}.`,
          "This is the first time the customer accessed the secure proposal link.",
          "Follow up while the scope is top of mind.",
        ].join("\n"),
        ctaLabel: "Open proposal in VoltPilot",
        ctaUrl: context.dashboardUrl,
        companyName,
      };
    case "accepted":
      return {
        subject: `Proposal ${proposalLabel} accepted by ${customerCompany}`,
        headline: "Proposal accepted",
        body: [
          `${customerName} at ${customerCompany} accepted proposal ${proposalLabel} for ${amountLabel}.`,
          context.comment ?
            `Customer comment: ${context.comment}`
          : "The customer signed electronically in the proposal portal.",
          "Review next steps and move the project forward.",
        ].join("\n"),
        ctaLabel: "View accepted proposal",
        ctaUrl: context.dashboardUrl,
        companyName,
      };
    case "rejected":
      return {
        subject: `Proposal ${proposalLabel} rejected by ${customerCompany}`,
        headline: "Proposal rejected",
        body: [
          `${customerName} at ${customerCompany} rejected proposal ${proposalLabel}.`,
          context.comment ?
            `Customer comment: ${context.comment}`
          : "No comment was left with the rejection.",
          "Review feedback and follow up with the customer or GC.",
        ].join("\n"),
        ctaLabel: "Review proposal",
        ctaUrl: context.dashboardUrl,
        companyName,
      };
    case "commented":
      return {
        subject: `${customerCompany} commented on proposal ${proposalLabel}`,
        headline: "New customer comment",
        body: [
          `${customerName} at ${customerCompany} left a comment on proposal ${proposalLabel}.`,
          context.comment ?
            `Comment: ${context.comment}`
          : "Open the proposal to read the full comment.",
          "Respond promptly to keep the deal moving.",
        ].join("\n"),
        ctaLabel: "View comment",
        ctaUrl: context.dashboardUrl,
        companyName,
      };
  }
}

export async function notifyContractorOfProposalEvent(
  event: ProposalNotificationEvent,
  context: ProposalNotificationContext
) {
  const recipientEmail = getContractorEmail(context.proposal);

  if (!recipientEmail) {
    return {
      sent: false,
      message: "No contractor email on file for notifications.",
    };
  }

  const copy = buildNotificationCopy(event, context);

  return sendProposalNotificationEmail({
    to: recipientEmail,
    ...copy,
  });
}

export function buildProposalDashboardUrl(proposalId: string) {
  return `${getSiteUrl()}/proposals/${proposalId}`;
}
