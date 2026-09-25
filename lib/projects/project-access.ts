import "server-only";

import {
  getOrganizationEntitlements,
  isB2BOrganizationPlan,
  type OrganizationEntitlements,
} from "@/lib/billing/entitlements";
import type { TeamRole } from "@/lib/teams/types";

export function orgEnforcesProjectAssignments(
  entitlements: OrganizationEntitlements
): boolean {
  return (
    isB2BOrganizationPlan(entitlements.planType) &&
    entitlements.projectVisibilityMode === "assigned"
  );
}

export function shouldFilterProjectsByAssignment(
  entitlements: OrganizationEntitlements,
  role: TeamRole
): boolean {
  if (!orgEnforcesProjectAssignments(entitlements)) {
    return false;
  }

  return role !== "owner" && role !== "admin";
}

export function canManageProjectAssignments(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

/** UI-only: who may see the assignments panel on project detail (B2B assigned mode). */
export function canViewProjectAssignmentsSection(role: TeamRole): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "project_manager"
  );
}

export async function getProjectAccessContext(organizationId: string, role: TeamRole) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  return {
    entitlements,
    enforceAssignments: orgEnforcesProjectAssignments(entitlements),
    filterListByAssignment: shouldFilterProjectsByAssignment(entitlements, role),
    canManageAssignments:
      orgEnforcesProjectAssignments(entitlements) && canManageProjectAssignments(role),
  };
}
