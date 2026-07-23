import type { TeamPermission, TeamRole } from "@/lib/teams/types";

const ROLE_PERMISSIONS: Record<TeamRole, TeamPermission[]> = {
  owner: [
    "dashboard.view",
    "customers.view",
    "customers.edit",
    "projects.view",
    "projects.edit",
    "estimates.view",
    "estimates.edit",
    "proposals.view",
    "proposals.edit",
    "analytics.view",
    "ai.view",
    "settings.company.view",
    "settings.company.edit",
    "settings.team.view",
    "settings.team.manage",
    "settings.billing.view",
    "settings.billing.manage",
  ],
  admin: [
    "dashboard.view",
    "customers.view",
    "customers.edit",
    "projects.view",
    "projects.edit",
    "estimates.view",
    "estimates.edit",
    "proposals.view",
    "proposals.edit",
    "analytics.view",
    "ai.view",
    "settings.company.view",
    "settings.company.edit",
    "settings.team.view",
    "settings.team.manage",
  ],
  estimator: [
    "dashboard.view",
    "customers.view",
    "projects.view",
    "projects.edit",
    "estimates.view",
    "estimates.edit",
    "proposals.view",
    "analytics.view",
    "ai.view",
  ],
  project_manager: [
    "dashboard.view",
    "customers.view",
    "customers.edit",
    "projects.view",
    "projects.edit",
    "estimates.view",
    "estimates.edit",
    "proposals.view",
    "proposals.edit",
    "analytics.view",
    "ai.view",
  ],
  viewer: [
    "dashboard.view",
    "customers.view",
    "projects.view",
    "estimates.view",
    "proposals.view",
    "analytics.view",
  ],
};

export function getPermissionsForRole(role: TeamRole): TeamPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(
  permissions: TeamPermission[],
  permission: TeamPermission
) {
  return permissions.includes(permission);
}

export function canManageRole(actorRole: TeamRole, targetRole: TeamRole) {
  if (actorRole === "owner") {
    return true;
  }

  if (actorRole === "admin") {
    return targetRole !== "owner";
  }

  return false;
}

export function canAssignRole(actorRole: TeamRole, nextRole: TeamRole) {
  if (nextRole === "owner") {
    return actorRole === "owner";
  }

  return canManageRole(actorRole, nextRole);
}

export const NAV_PERMISSIONS: Record<string, TeamPermission> = {
  "/dashboard": "dashboard.view",
  "/ai": "ai.view",
  "/customers": "customers.view",
  "/projects": "projects.view",
  "/estimates": "estimates.view",
  "/proposals": "proposals.view",
  "/analytics": "analytics.view",
  "/settings": "settings.company.view",
};

export function filterNavItemsByPermissions<T extends { href: string }>(
  items: T[],
  permissions: TeamPermission[]
) {
  return items.filter((item) => {
    const required = NAV_PERMISSIONS[item.href];
    return required ? hasPermission(permissions, required) : true;
  });
}
