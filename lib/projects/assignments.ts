import "server-only";

import { createClient } from "@/lib/supabase/server";
import { TEAM_ROLE_LABELS, type TeamRole } from "@/lib/teams/types";

export type ProjectAssignmentRow = {
  id: string;
  project_id: string;
  team_member_id: string;
  assigned_at: string;
  assigned_by: string | null;
  team_member: {
    id: string;
    email: string;
    display_name: string | null;
    role: TeamRole;
    status: string;
  };
};

export type ProjectAssignmentView = {
  id: string;
  teamMemberId: string;
  assignedAt: string;
  email: string;
  displayName: string;
  role: TeamRole;
  roleLabel: string;
};

export type AssignableTeamMember = {
  id: string;
  email: string;
  displayName: string;
  role: TeamRole;
  roleLabel: string;
};

function memberDisplayName(member: {
  display_name: string | null;
  email: string;
}) {
  return member.display_name?.trim() || member.email;
}

export async function getProjectAssignments(
  projectId: string
): Promise<ProjectAssignmentView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_assignments")
    .select(
      `
        id,
        project_id,
        team_member_id,
        assigned_at,
        assigned_by,
        team_member:team_members!inner (
          id,
          email,
          display_name,
          role,
          status
        )
      `
    )
    .eq("project_id", projectId)
    .order("assigned_at", { ascending: true });

  if (error) {
    if (error.message.includes("project_assignments")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const member = Array.isArray(row.team_member)
      ? row.team_member[0]
      : row.team_member;

    const role = member.role as TeamRole;

    return {
      id: row.id,
      teamMemberId: row.team_member_id,
      assignedAt: row.assigned_at,
      email: member.email,
      displayName: memberDisplayName(member),
      role,
      roleLabel: TEAM_ROLE_LABELS[role],
    };
  });
}

export async function getAssignableTeamMembers(
  organizationId: string,
  projectId: string
): Promise<AssignableTeamMember[]> {
  const supabase = await createClient();

  const [membersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, email, display_name, role")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("email", { ascending: true }),
    supabase
      .from("project_assignments")
      .select("team_member_id")
      .eq("project_id", projectId),
  ]);

  if (membersResult.error) {
    throw new Error(membersResult.error.message);
  }

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const assignedIds = new Set(
    (assignmentsResult.data ?? []).map((row) => row.team_member_id)
  );

  return (membersResult.data ?? [])
    .filter((member) => !assignedIds.has(member.id))
    .map((member) => {
      const role = member.role as TeamRole;
      return {
        id: member.id,
        email: member.email,
        displayName: memberDisplayName(member),
        role,
        roleLabel: TEAM_ROLE_LABELS[role],
      };
    });
}

export async function getAssignedProjectIdsForMember(
  organizationId: string,
  teamMemberId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_assignments")
    .select("project_id, projects!inner(organization_id)")
    .eq("team_member_id", teamMemberId);

  if (error) {
    if (error.message.includes("project_assignments")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => {
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      return project?.organization_id === organizationId;
    })
    .map((row) => row.project_id);
}
