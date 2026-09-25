import "server-only";

import {
  getOrganizationEntitlements,
  isB2BOrganizationPlan,
} from "@/lib/billing/entitlements";
import type { LogCompanyAuditEventInput } from "@/lib/audit/types";
import { createClient } from "@/lib/supabase/server";

export async function logCompanyAuditEvent(
  input: LogCompanyAuditEventInput
): Promise<void> {
  const entitlements = await getOrganizationEntitlements(input.organizationId);

  if (!isB2BOrganizationPlan(entitlements.planType)) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organization_audit_events").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    actor_display_name: input.actorDisplayName.trim() || "Team member",
    event_type: input.eventType,
    summary: input.summary,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error && !error.message.includes("organization_audit_events")) {
    console.error("[audit] failed to log company event", error.message);
  }
}
