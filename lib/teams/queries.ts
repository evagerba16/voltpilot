import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getDefaultCompanySettings } from "@/lib/company/queries";
import { readOrganizationPreference } from "@/lib/teams/organization-preference";
import { getPermissionsForRole } from "@/lib/teams/permissions";
import type {
  Organization,
  TeamContext,
  TeamInvitation,
  TeamMember,
  TeamOverview,
} from "@/lib/teams/types";

type MembershipRow = TeamMember & {
  organization: Organization | Organization[];
};

function resolveOrganization(row: MembershipRow["organization"]): Organization {
  return (Array.isArray(row) ? row[0] : row) as Organization;
}

function mapTeamMember(data: MembershipRow): TeamMember {
  return {
    id: data.id,
    organization_id: data.organization_id,
    user_id: data.user_id,
    email: data.email,
    display_name: data.display_name,
    role: data.role,
    status: data.status,
    invited_by: data.invited_by,
    joined_at: data.joined_at,
    deactivated_at: data.deactivated_at,
    deactivated_by: data.deactivated_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function ensureUserOrganization(
  userId: string,
  email: string,
  companyName?: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_user_organization", {
    p_user_id: userId,
    p_email: email,
    p_company_name: companyName ?? "Your Company",
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function getTeamAccessDenial(
  userId: string
): Promise<"deactivated" | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("status")
    .eq("user_id", userId);

  if (error) {
    if (error.message.includes("team_members")) {
      return null;
    }

    throw new Error(error.message);
  }

  const memberships = data ?? [];

  if (memberships.length === 0) {
    return null;
  }

  if (memberships.some((member) => member.status === "active")) {
    return null;
  }

  if (memberships.some((member) => member.status === "deactivated")) {
    return "deactivated";
  }

  return null;
}

async function listActiveTeamMemberships(userId: string): Promise<MembershipRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
        *,
        organization:organizations!inner (*)
      `
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: false });

  if (error) {
    if (
      error.message.includes("team_members") ||
      error.message.includes("organizations")
    ) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as MembershipRow[];
}

function selectPreferredMembership(
  memberships: MembershipRow[],
  preferredOrganizationId?: string | null
) {
  if (memberships.length === 0) {
    return null;
  }

  if (preferredOrganizationId) {
    const matched = memberships.find(
      (member) => member.organization_id === preferredOrganizationId
    );

    if (matched) {
      return matched;
    }
  }

  const invitedMembership = memberships.find((member) => member.invited_by);

  if (invitedMembership) {
    return invitedMembership;
  }

  return memberships[0];
}

export async function getTeamMembership(
  userId: string,
  organizationId?: string
): Promise<{ organization: Organization; member: TeamMember } | null> {
  const memberships = await listActiveTeamMemberships(userId);
  let preferredOrganizationId = organizationId;

  if (!preferredOrganizationId) {
    preferredOrganizationId = (await readOrganizationPreference()) ?? undefined;
  }

  const selected = selectPreferredMembership(memberships, preferredOrganizationId);

  if (!selected) {
    return null;
  }

  return {
    organization: resolveOrganization(selected.organization),
    member: mapTeamMember(selected),
  };
}

export async function buildTeamContext(
  userId: string,
  email: string
): Promise<TeamContext | null> {
  const membership = await getTeamMembership(userId);

  if (!membership) {
    const denial = await getTeamAccessDenial(userId);

    if (denial === "deactivated") {
      return null;
    }

    const supabase = await createClient();
    const { count, error } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      if (error.message.includes("team_members")) {
        return null;
      }

      throw new Error(error.message);
    }

    if ((count ?? 0) > 0) {
      return null;
    }

    return null;
  }

  if (!membership) {
    return null;
  }

  const permissions = getPermissionsForRole(membership.member.role);

  return {
    userId,
    userEmail: email,
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    role: membership.member.role,
    memberId: membership.member.id,
    permissions,
  };
}

export async function getTeamOverview(
  organizationId: string,
  currentUserId: string
): Promise<TeamOverview | null> {
  const supabase = await createClient();

  const [orgResult, membersResult, invitesResult] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", organizationId).single(),
    supabase
      .from("team_members")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("team_invitations")
      .select("*")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  if (orgResult.error || !orgResult.data) {
    return null;
  }

  if (membersResult.error) {
    throw new Error(membersResult.error.message);
  }

  if (invitesResult.error) {
    throw new Error(invitesResult.error.message);
  }

  const members = (membersResult.data ?? []) as TeamMember[];
  const currentMember = members.find(
    (member) => member.user_id === currentUserId && member.status === "active"
  );

  if (!currentMember) {
    return null;
  }

  return {
    organization: orgResult.data as Organization,
    members: members.map((member) => ({
      ...member,
      isCurrentUser: member.user_id === currentUserId,
    })),
    invitations: (invitesResult.data ?? []) as TeamInvitation[],
    currentMember,
  };
}

export async function getInvitationByToken(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_team_invitation_by_token", {
    p_token: token,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const payload = data as {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    organization: { id: string; name: string };
  };

  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    expires_at: payload.expires_at,
    organization: payload.organization,
  };
}

export async function getCompanyNameForBootstrap(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_settings")
    .select("company_name")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.company_name ?? getDefaultCompanySettings(userId).company_name;
}
