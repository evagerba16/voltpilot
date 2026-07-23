import "server-only";

import { createClient } from "@/lib/supabase/server";
import { recordProposalStatusChange } from "@/lib/proposals/revisions";
import type { Proposal, ProposalStatus } from "@/lib/proposals/types";

type StatusTransitionContext = {
  proposalId: string;
  organizationId: string;
  changedBy?: string | null;
  note?: string | null;
};

async function updateProposalStatus(
  proposalId: string,
  organizationId: string,
  previousStatus: ProposalStatus,
  newStatus: ProposalStatus,
  patch: Record<string, unknown>,
  context: StatusTransitionContext
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposals")
    .update({
      status: newStatus,
      ...patch,
    })
    .eq("id", proposalId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  if (previousStatus !== newStatus) {
    await recordProposalStatusChange({
      proposalId,
      organizationId,
      previousStatus,
      newStatus,
      changedBy: context.changedBy ?? null,
      note: context.note ?? null,
    });
  }
}

export async function markProposalAsSent(
  proposal: Proposal,
  context: StatusTransitionContext & {
    sentAt?: string;
    emailSendCount?: number;
    lastEmailedAt?: string | null;
  }
) {
  const sentAt = context.sentAt ?? new Date().toISOString();

  await updateProposalStatus(
    proposal.id,
    context.organizationId,
    proposal.status,
    "Sent",
    {
      sent_at: sentAt,
      ...(context.lastEmailedAt ? { last_emailed_at: context.lastEmailedAt } : {}),
      ...(typeof context.emailSendCount === "number"
        ? { email_send_count: context.emailSendCount }
        : {}),
    },
    {
      ...context,
      note: context.note ?? "Proposal sent to customer",
    }
  );

  return sentAt;
}

export async function markProposalAsViewed(
  proposalId: string,
  organizationId: string,
  previousStatus: ProposalStatus,
  viewedAt = new Date().toISOString()
) {
  if (previousStatus !== "Sent") {
    return { promotedToViewed: false };
  }

  await updateProposalStatus(
    proposalId,
    organizationId,
    previousStatus,
    "Viewed",
    {
      viewed_at: viewedAt,
      first_viewed_at: viewedAt,
    },
    {
      proposalId,
      organizationId,
      note: "Customer viewed proposal in portal",
    }
  );

  return { promotedToViewed: true };
}

export async function markProposalAsAccepted(
  proposalId: string,
  organizationId: string,
  previousStatus: ProposalStatus,
  patch: {
    signerName?: string | null;
    signatureData?: string | null;
    acceptedAt?: string;
  } = {}
) {
  const acceptedAt = patch.acceptedAt ?? new Date().toISOString();

  await updateProposalStatus(
    proposalId,
    organizationId,
    previousStatus,
    "Accepted",
    {
      accepted_at: acceptedAt,
      decided_at: acceptedAt,
      customer_signed_at: acceptedAt,
      customer_signed_name: patch.signerName ?? null,
      customer_signature_data: patch.signatureData ?? null,
    },
    {
      proposalId,
      organizationId,
      note: "Customer accepted via portal",
    }
  );
}

export async function markProposalAsRejected(
  proposalId: string,
  organizationId: string,
  previousStatus: ProposalStatus,
  declinedAt = new Date().toISOString()
) {
  await updateProposalStatus(
    proposalId,
    organizationId,
    previousStatus,
    "Declined",
    {
      declined_at: declinedAt,
      decided_at: declinedAt,
    },
    {
      proposalId,
      organizationId,
      note: "Customer rejected via portal",
    }
  );
}

export async function markProposalAsExpired(
  proposalId: string,
  organizationId: string,
  previousStatus: ProposalStatus
) {
  if (previousStatus === "Expired") {
    return;
  }

  await updateProposalStatus(
    proposalId,
    organizationId,
    previousStatus,
    "Expired",
    {},
    {
      proposalId,
      organizationId,
      note: "Proposal expired",
    }
  );
}

export async function updateProjectStatusAfterProposalSent(
  projectId: string,
  organizationId: string
) {
  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({ status: "Proposal Sent" })
    .eq("id", projectId)
    .eq("organization_id", organizationId);
}

export async function updateProjectStatusAfterProposalAccepted(
  projectId: string,
  organizationId: string
) {
  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({ status: "Awarded" })
    .eq("id", projectId)
    .eq("organization_id", organizationId);
}

export async function updateProjectStatusAfterProposalRejected(
  projectId: string,
  organizationId: string
) {
  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({ status: "Lost" })
    .eq("id", projectId)
    .eq("organization_id", organizationId);
}
