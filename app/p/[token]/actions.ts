"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  buildProposalDashboardUrl,
  notifyContractorOfProposalEvent,
} from "@/lib/proposals/proposal-notification-service";
import {
  assertSignatureDataUrl,
  MAX_PORTAL_COMMENT_LENGTH,
  MAX_PORTAL_SIGNER_NAME_LENGTH,
} from "@/lib/security/url-validation";
import {
  getProposalByPortalToken,
  recordProposalPortalView,
  submitProposalPortalComment,
  submitProposalPortalResponse,
} from "@/lib/proposals/portal";

function portalLoadError() {
  return "We couldn't load this proposal. The link may be invalid or expired.";
}

function portalSubmitError() {
  return "We couldn't submit your response. Try again in a moment.";
}

function portalCommentError() {
  return "We couldn't send your comment. Try again in a moment.";
}

export async function loadCustomerProposal(token: string) {
  const headerStore = await headers();
  const viewerIp =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip");
  const userAgent = headerStore.get("user-agent");

  let proposal;

  try {
    proposal = await getProposalByPortalToken(token);
  } catch {
    return {
      error: "invalid" as const,
      message: portalLoadError(),
    };
  }

  if (!proposal) {
    return { error: "invalid" as const };
  }

  if (proposal.status === "Expired") {
    return { error: "expired" as const, proposal };
  }

  const previousStatus = proposal.status;

  try {
    const viewResult = await recordProposalPortalView(
      token,
      viewerIp,
      userAgent,
      previousStatus
    );

    if (viewResult.promotedToViewed) {
      void notifyContractorOfProposalEvent("viewed", {
        proposal,
        dashboardUrl: buildProposalDashboardUrl(proposal.id),
      });
    }
  } catch {
    // View tracking is best-effort; still render the proposal.
  }

  try {
    const refreshed = await getProposalByPortalToken(token);
    return { proposal: refreshed ?? proposal };
  } catch {
    return { proposal };
  }
}

export async function respondToCustomerProposal(input: {
  token: string;
  action: "accept" | "decline";
  signerName?: string;
  signatureData?: string;
  comment?: string;
}) {
  const trimmedComment = input.comment?.trim() ?? "";
  const signerName = input.signerName?.trim().slice(0, MAX_PORTAL_SIGNER_NAME_LENGTH);

  if (trimmedComment.length > MAX_PORTAL_COMMENT_LENGTH) {
    return { error: "Your comment is too long. Shorten it and try again." };
  }

  if (input.action === "accept") {
    const signatureData = assertSignatureDataUrl(input.signatureData);
    if (!signatureData) {
      return { error: "Add your signature before accepting this proposal." };
    }

    input = { ...input, signatureData, signerName, comment: trimmedComment };
  } else {
    input = { ...input, signerName, comment: trimmedComment, signatureData: undefined };
  }

  let proposal;

  try {
    proposal = await getProposalByPortalToken(input.token);
  } catch {
    return { error: portalLoadError() };
  }

  if (!proposal) {
    return { error: portalLoadError() };
  }

  if (proposal.status === "Draft") {
    return {
      error: "This proposal is not available for response yet.",
    };
  }

  if (!["Sent", "Viewed"].includes(proposal.status)) {
    return { error: "This proposal is no longer open for response." };
  }

  let result;

  try {
    result = await submitProposalPortalResponse(input);
  } catch {
    return { error: portalSubmitError() };
  }

  if (!result.success) {
    return { error: result.error ?? portalSubmitError() };
  }

  if (proposal) {
    void notifyContractorOfProposalEvent(
      input.action === "accept" ? "accepted" : "rejected",
      {
        proposal,
        dashboardUrl: buildProposalDashboardUrl(proposal.id),
        comment: input.comment?.trim() || undefined,
      }
    );
  }

  revalidatePath(`/p/${input.token}`);
  return { success: true, status: result.status };
}

export async function commentOnCustomerProposal(input: {
  token: string;
  authorName?: string;
  comment: string;
}) {
  const trimmedComment = input.comment.trim();

  if (!trimmedComment) {
    return { error: "Enter a comment before sending." };
  }

  if (trimmedComment.length > MAX_PORTAL_COMMENT_LENGTH) {
    return { error: "Your comment is too long. Shorten it and try again." };
  }

  let proposal;

  try {
    proposal = await getProposalByPortalToken(input.token);
  } catch {
    return { error: portalLoadError() };
  }

  if (!proposal) {
    return { error: "This proposal could not be found." };
  }

  if (["Accepted", "Declined", "Expired"].includes(proposal.status)) {
    return { error: "This proposal is closed and no longer accepts comments." };
  }

  let result;

  try {
    result = await submitProposalPortalComment({
      token: input.token,
      authorName: input.authorName?.trim().slice(0, MAX_PORTAL_SIGNER_NAME_LENGTH),
      comment: trimmedComment,
    });
  } catch {
    return { error: portalCommentError() };
  }

  if (!result.success) {
    return { error: result.error ?? portalCommentError() };
  }

  void notifyContractorOfProposalEvent("commented", {
    proposal,
    dashboardUrl: buildProposalDashboardUrl(proposal.id),
    comment: trimmedComment,
  });

  revalidatePath(`/p/${input.token}`);
  return { success: true };
}
