"use client";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { hasPermission } from "@/lib/teams/permissions";
import type { TeamPermission } from "@/lib/teams/types";

export function usePermissions() {
  const { permissions } = useDashboard();

  return {
    permissions,
    can: (permission: TeamPermission) => hasPermission(permissions, permission),
  };
}
