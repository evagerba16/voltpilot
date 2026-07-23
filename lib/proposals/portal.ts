import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProposalPortalData, ProposalStatus } from "@/lib/proposals/types";

export async function getProposalByPortalToken(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_proposal_by_portal_token", {
    p_token: token,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const proposal = data as ProposalPortalData;
  return {
    ...proposal,
    media: proposal.media ?? [],
  };
}

export async function recordProposalPortalView(
  token: string,
  viewerIp?: string | null,
  userAgent?: string | null,
  previousStatus?: string | null
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_proposal_portal_view", {
    p_token: token,
    p_viewer_ip: viewerIp ?? null,
    p_user_agent: userAgent ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    recorded: Boolean(data),
    promotedToViewed: previousStatus === "Sent",
  };
}

export async function submitProposalPortalComment(input: {
  token: string;
  authorName?: string;
  comment: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_proposal_portal_comment", {
    p_token: input.token,
    p_author_name: input.authorName ?? null,
    p_comment: input.comment,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    success: boolean;
    error?: string;
    comment_id?: string;
  };
}

export async function submitProposalPortalResponse(input: {
  token: string;
  action: "accept" | "decline";
  signerName?: string;
  signatureData?: string;
  comment?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_proposal_portal_response", {
    p_token: input.token,
    p_action: input.action,
    p_signer_name: input.signerName ?? null,
    p_signature_data: input.signatureData ?? null,
    p_comment: input.comment ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    success: boolean;
    error?: string;
    status?: ProposalStatus;
  };
}
