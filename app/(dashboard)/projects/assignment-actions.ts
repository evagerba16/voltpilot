"use server";

import { revalidatePath } from "next/cache";

import { assertPermission } from "@/lib/auth/get-team-context";
import { getOrganizationEntitlements } from "@/lib/billing/entitlements";
import {
  canManageProjectAssignments,
  orgEnforcesProjectAssignments,
} from "@/lib/projects/project-access";
import { verifyProjectOwnership } from "@/lib/projects/queries";
import { logCompanyAuditEvent } from "@/lib/audit/log-company-event";
import { createClient } from "@/lib/supabase/server";

async function assertAssignmentManagement(projectId: string) {
  const context = await assertPermission("projects.assign");
  const entitlements = await getOrganizationEntitlements(context.organizationId);

  if (!orgEnforcesProjectAssignments(entitlements)) {
    throw new Error("Project assignments are not enabled for this organization.");
  }

  if (!canManageProjectAssignments(context.role)) {
    throw new Error("You do not have permission to manage project assignments.");
  }

  const ownsProject = await verifyProjectOwnership(
    projectId,
    context.organizationId
  );

  if (!ownsProject) {
    throw new Error("This project could not be found.");
  }

  return context;
}

async function verifyAssignableMember(
  organizationId: string,
  teamMemberId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", teamMemberId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  return !error && Boolean(data);
}

async function getProjectAssignmentLabels(
  organizationId: string,
  projectId: string,
  teamMemberId: string
) {
  const supabase = await createClient();
  const [projectResult, memberResult] = await Promise.all([
    supabase
      .from("projects")
      .select("project_name")
      .eq("id", projectId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select("display_name, email")
      .eq("id", teamMemberId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  const projectName = projectResult.data?.project_name ?? "Project";
  const memberLabel =
    memberResult.data?.display_name?.trim() ||
    memberResult.data?.email ||
    "Team member";

  return { projectName, memberLabel };
}

export async function assignProjectMember(projectId: string, teamMemberId: string) {
  try {
    const context = await assertAssignmentManagement(projectId);
    const trimmedMemberId = teamMemberId.trim();

    if (!trimmedMemberId) {
      return { error: "Select a team member to assign." };
    }

    const validMember = await verifyAssignableMember(
      context.organizationId,
      trimmedMemberId
    );

    if (!validMember) {
      return { error: "That team member could not be found." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("project_assignments").insert({
      project_id: projectId,
      team_member_id: trimmedMemberId,
      assigned_by: context.userId,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "That team member is already assigned to this project." };
      }

      return { error: "We couldn't assign this team member. Try again in a moment." };
    }

    const { projectName, memberLabel } = await getProjectAssignmentLabels(
      context.organizationId,
      projectId,
      trimmedMemberId
    );

    await logCompanyAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      actorDisplayName: context.displayName,
      eventType: "project_assigned",
      summary: `${context.displayName} assigned ${memberLabel} to ${projectName}`,
      entityType: "project",
      entityId: projectId,
      metadata: { teamMemberId: trimmedMemberId },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We couldn't assign this team member. Try again in a moment.",
    };
  }
}

export async function unassignProjectMember(
  projectId: string,
  assignmentId: string
) {
  try {
    const context = await assertAssignmentManagement(projectId);
    const trimmedAssignmentId = assignmentId.trim();

    if (!trimmedAssignmentId) {
      return { error: "Select an assignment to remove." };
    }

    const supabase = await createClient();
    const { data: assignment, error: fetchError } = await supabase
      .from("project_assignments")
      .select("id, project_id, team_member_id")
      .eq("id", trimmedAssignmentId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (fetchError || !assignment) {
      return { error: "That assignment could not be found." };
    }

    const { error } = await supabase
      .from("project_assignments")
      .delete()
      .eq("id", trimmedAssignmentId)
      .eq("project_id", projectId);

    if (error) {
      return { error: "We couldn't remove this assignment. Try again in a moment." };
    }

    const { projectName, memberLabel } = await getProjectAssignmentLabels(
      context.organizationId,
      projectId,
      assignment.team_member_id
    );

    await logCompanyAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      actorDisplayName: context.displayName,
      eventType: "project_unassigned",
      summary: `${context.displayName} unassigned ${memberLabel} from ${projectName}`,
      entityType: "project",
      entityId: projectId,
      metadata: { teamMemberId: assignment.team_member_id, assignmentId: trimmedAssignmentId },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We couldn't remove this assignment. Try again in a moment.",
    };
  }
}
