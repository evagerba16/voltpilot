import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getTeamAccessDenial } from "@/lib/teams/queries";

export type AcceptTeamInvitationResult =
  | { success: true; organizationId?: string }
  | { error: string };

function mapRpcFailure(rpcError: string): string {
  const normalized = rpcError.toLowerCase();

  if (normalized.includes("expired")) {
    return "This invitation has expired. Ask your admin to send a new one.";
  }

  if (normalized.includes("revoked")) {
    return "This invitation is no longer active.";
  }

  if (normalized.includes("email")) {
    return "Sign in with the email address this invitation was sent to, then try again.";
  }

  if (normalized.includes("seat limit")) {
    return "This company has reached its seat limit. Ask your admin to free a seat or upgrade your plan.";
  }

  return "We couldn't accept this invitation. Try again in a moment.";
}

export async function acceptTeamInvitationCore(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email">,
  token: string
): Promise<AcceptTeamInvitationResult> {
  if (!user.email) {
    return { error: "Sign in to accept this invitation." };
  }

  const denial = await getTeamAccessDenial(user.id);

  if (denial === "deactivated") {
    return {
      error:
        "Your account has been deactivated. Contact your organization admin.",
    };
  }

  const { data, error } = await supabase.rpc("accept_team_invitation_by_token", {
    p_token: token,
  });

  if (error) {
    return { error: "We couldn't accept this invitation. Try again in a moment." };
  }

  const result = data as {
    success: boolean;
    error?: string;
    organization_id?: string;
  };

  if (!result.success) {
    return { error: mapRpcFailure(result.error ?? "") };
  }

  return { success: true, organizationId: result.organization_id };
}
