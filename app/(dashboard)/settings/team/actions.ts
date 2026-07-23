"use server";

import { revalidatePath } from "next/cache";

import { assertPermission, requireTeamContext } from "@/lib/auth/get-team-context";
import { getUser } from "@/lib/auth/get-user";
import { sendInvitationEmail } from "@/lib/email/send-invitation";
import { assertValidEmail } from "@/lib/security/url-validation";
import { canAssignRole, canManageRole } from "@/lib/teams/permissions";
import { persistOrganizationPreference } from "@/lib/teams/actions";
import { getTeamAccessDenial, getTeamOverview } from "@/lib/teams/queries";
import {
  INVITABLE_ROLES,
  TEAM_ROLE_LABELS,
  type InvitableRole,
  type TeamRole,
} from "@/lib/teams/types";
import { createClient } from "@/lib/supabase/server";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function isValidInvitableRole(role: string): role is InvitableRole {
  return INVITABLE_ROLES.includes(role as InvitableRole);
}

export async function inviteTeamMember(formData: FormData) {
  const context = await assertPermission("settings.team.manage");
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = assertValidEmail(emailRaw);
  const role = String(formData.get("role") ?? "").trim();

  if (!email) {
    return { error: "Enter a valid email address." };
  }

  if (!isValidInvitableRole(role)) {
    return { error: "Select a valid role." };
  }

  if (!canAssignRole(context.role, role)) {
    return { error: "You cannot assign that role." };
  }

  const supabase = await createClient();

  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("organization_id", context.organizationId)
    .eq("email", email)
    .maybeSingle();

  if (existingMember?.status === "active") {
    return { error: "This person is already an active team member." };
  }

  const { data: invitation, error } = await supabase
    .from("team_invitations")
    .upsert(
      {
        organization_id: context.organizationId,
        email,
        role,
        invited_by: context.userId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        accepted_at: null,
        revoked_at: null,
      },
      { onConflict: "organization_id,email" }
    )
    .select("token")
    .single();

  if (error || !invitation) {
    return {
      error: "We couldn't send this invitation. Try again in a moment.",
    };
  }

  const inviteUrl = `${getSiteUrl()}/invite/${invitation.token}`;
  const emailResult = await sendInvitationEmail({
    to: email,
    organizationName: context.organizationName,
    inviterEmail: context.userEmail,
    roleLabel: TEAM_ROLE_LABELS[role],
    inviteUrl,
  });

  revalidatePath("/settings/team");
  return {
    success: true,
    inviteUrl,
    emailSent: emailResult.sent,
    message: emailResult.message,
  };
}

export async function updateTeamMemberRole(memberId: string, role: TeamRole) {
  const context = await assertPermission("settings.team.manage");

  if (!canAssignRole(context.role, role)) {
    return { error: "You cannot assign that role." };
  }

  const supabase = await createClient();
  const { data: member, error: fetchError } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", memberId)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !member) {
    return { error: "This team member could not be found." };
  }

  if (!canManageRole(context.role, member.role as TeamRole)) {
    return { error: "You cannot modify this team member." };
  }

  if (member.role === "owner" && role !== "owner") {
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organizationId)
      .eq("role", "owner")
      .eq("status", "active");

    if ((count ?? 0) <= 1) {
      return { error: "At least one owner is required." };
    }
  }

  const { error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return {
      error: "We couldn't update this team member's role. Try again in a moment.",
    };
  }

  revalidatePath("/settings/team");
  return { success: true };
}

export async function deactivateTeamMember(memberId: string) {
  const context = await assertPermission("settings.team.manage");
  const supabase = await createClient();

  const { data: member, error: fetchError } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", memberId)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !member) {
    return { error: "This team member could not be found." };
  }

  if (member.user_id === context.userId) {
    return { error: "You cannot deactivate your own account." };
  }

  if (!canManageRole(context.role, member.role as TeamRole)) {
    return { error: "You cannot deactivate this team member." };
  }

  if (member.role === "owner") {
    return { error: "Transfer ownership before deactivating an owner." };
  }

  const { error } = await supabase
    .from("team_members")
    .update({
      status: "deactivated",
      deactivated_at: new Date().toISOString(),
      deactivated_by: context.userId,
    })
    .eq("id", memberId);

  if (error) {
    return {
      error: "We couldn't deactivate this team member. Try again in a moment.",
    };
  }

  revalidatePath("/settings/team");
  return { success: true };
}

export async function reactivateTeamMember(memberId: string) {
  const context = await assertPermission("settings.team.manage");
  const supabase = await createClient();

  const { data: member, error: fetchError } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", memberId)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !member) {
    return { error: "This team member could not be found." };
  }

  if (!canManageRole(context.role, member.role as TeamRole)) {
    return { error: "You cannot reactivate this team member." };
  }

  const { error } = await supabase
    .from("team_members")
    .update({
      status: "active",
      deactivated_at: null,
      deactivated_by: null,
    })
    .eq("id", memberId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return {
      error: "We couldn't reactivate this team member. Try again in a moment.",
    };
  }

  revalidatePath("/settings/team");
  return { success: true };
}

export async function revokeTeamInvitation(invitationId: string) {
  const context = await assertPermission("settings.team.manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't revoke this invitation. Try again in a moment." };
  }

  revalidatePath("/settings/team");
  return { success: true };
}

export async function acceptTeamInvitation(token: string) {
  const user = await getUser();

  if (!user?.email) {
    return { error: "Sign in to accept this invitation." };
  }

  const denial = await getTeamAccessDenial(user.id);

  if (denial === "deactivated") {
    return {
      error:
        "Your account has been deactivated. Contact your organization admin.",
    };
  }

  const supabase = await createClient();

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
    const rpcError = result.error?.toLowerCase() ?? "";

    if (rpcError.includes("expired")) {
      return { error: "This invitation has expired. Ask your admin to send a new one." };
    }

    if (rpcError.includes("revoked")) {
      return { error: "This invitation is no longer active." };
    }

    if (rpcError.includes("email")) {
      return {
        error:
          "Sign in with the email address this invitation was sent to, then try again.",
      };
    }

    return { error: "We couldn't accept this invitation. Try again in a moment." };
  }

  if (result.organization_id) {
    await persistOrganizationPreference(result.organization_id);
  }

  revalidatePath("/settings/team");
  revalidatePath("/dashboard");

  return { success: true, organizationId: result.organization_id };
}

export async function getTeamPageData() {
  const context = await requireTeamContext();

  if (!context.permissions.includes("settings.team.view")) {
    return { error: "You do not have permission to view team settings." };
  }

  const overview = await getTeamOverview(context.organizationId, context.userId);

  if (!overview) {
    return {
      error: "We couldn't load your team. Refresh the page or try again in a moment.",
    };
  }

  return {
    overview,
    context,
    canManage: context.permissions.includes("settings.team.manage"),
  };
}
