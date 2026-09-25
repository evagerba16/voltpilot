import "server-only";

import {
  getOrganizationEntitlements,
  isB2BOrganizationPlan,
} from "@/lib/billing/entitlements";
import { hasPermission } from "@/lib/teams/permissions";
import type {
  OrganizationAuditEvent,
  OrganizationAuditEventType,
} from "@/lib/audit/types";
import type { TeamPermission } from "@/lib/teams/types";
import { createClient } from "@/lib/supabase/server";

const AUDIT_LIST_LIMIT = 100;

export async function shouldShowAuditLogInSettings(
  organizationId: string,
  permissions: TeamPermission[]
): Promise<boolean> {
  if (!hasPermission(permissions, "settings.audit.view")) {
    return false;
  }

  const entitlements = await getOrganizationEntitlements(organizationId);
  return isB2BOrganizationPlan(entitlements.planType);
}

export async function listOrganizationAuditEvents(
  organizationId: string
): Promise<OrganizationAuditEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_audit_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(AUDIT_LIST_LIMIT);

  if (error) {
    if (error.message.includes("organization_audit_events")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    actor_user_id: row.actor_user_id,
    actor_display_name: row.actor_display_name,
    event_type: row.event_type as OrganizationAuditEventType,
    summary: row.summary,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at,
  }));
}
