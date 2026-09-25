export const ORGANIZATION_AUDIT_EVENT_TYPES = [
  "team_member_invited",
  "team_invitation_revoked",
  "team_member_deactivated",
  "team_member_reactivated",
  "team_member_role_changed",
  "project_assigned",
  "project_unassigned",
  "company_settings_updated",
] as const;

export type OrganizationAuditEventType =
  (typeof ORGANIZATION_AUDIT_EVENT_TYPES)[number];

export type OrganizationAuditEvent = {
  id: string;
  organization_id: string;
  actor_user_id: string;
  actor_display_name: string;
  event_type: OrganizationAuditEventType;
  summary: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LogCompanyAuditEventInput = {
  organizationId: string;
  actorUserId: string;
  actorDisplayName: string;
  eventType: OrganizationAuditEventType;
  summary: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};
