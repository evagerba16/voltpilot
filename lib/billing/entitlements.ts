import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/teams/permissions";
import type { TeamPermission } from "@/lib/teams/types";

export type OrganizationPlanType = "solo" | "b2b" | "legacy";
export type OrganizationBillingSource = "stripe" | "manual" | "legacy";
export type ProjectVisibilityMode = "open" | "assigned";

export type OrganizationEntitlements = {
  organizationId: string;
  seatLimit: number | null;
  planType: OrganizationPlanType;
  billingSource: OrganizationBillingSource;
  companyQuoteRequestId: string | null;
  projectVisibilityMode: ProjectVisibilityMode;
};

export function isB2BOrganizationPlan(planType: OrganizationPlanType): boolean {
  return planType === "b2b";
}

export async function shouldShowBillingInSettings(
  organizationId: string,
  permissions: TeamPermission[]
): Promise<boolean> {
  if (!hasPermission(permissions, "settings.billing.view")) {
    return false;
  }

  const entitlements = await getOrganizationEntitlements(organizationId);
  return !isB2BOrganizationPlan(entitlements.planType);
}

export type OrganizationSeatUsage = {
  activeMembers: number;
  pendingInvites: number;
  seatsUsed: number;
  seatLimit: number | null;
  seatsRemaining: number | null;
  canAddSeat: boolean;
};

const DEFAULT_ENTITLEMENTS = (
  organizationId: string
): OrganizationEntitlements => ({
  organizationId,
  seatLimit: null,
  planType: "legacy",
  billingSource: "legacy",
  companyQuoteRequestId: null,
  projectVisibilityMode: "open",
});

export async function getOrganizationEntitlements(
  organizationId: string
): Promise<OrganizationEntitlements> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_entitlements")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("organization_entitlements")) {
      return DEFAULT_ENTITLEMENTS(organizationId);
    }

    throw new Error(error.message);
  }

  if (!data) {
    return DEFAULT_ENTITLEMENTS(organizationId);
  }

  return {
    organizationId: data.organization_id,
    seatLimit: data.seat_limit,
    planType: data.plan_type as OrganizationPlanType,
    billingSource: data.billing_source as OrganizationBillingSource,
    companyQuoteRequestId: data.company_quote_request_id,
    projectVisibilityMode:
      (data.project_visibility_mode as ProjectVisibilityMode | null) ?? "open",
  };
}

export async function getOrganizationSeatUsage(
  organizationId: string
): Promise<OrganizationSeatUsage> {
  const supabase = await createClient();
  const entitlements = await getOrganizationEntitlements(organizationId);

  const [membersResult, invitesResult, seatsUsedResult] = await Promise.all([
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("team_invitations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString()),
    supabase.rpc("count_organization_seats", {
      p_organization_id: organizationId,
    }),
  ]);

  const activeMembers = membersResult.count ?? 0;
  const pendingInvites = invitesResult.count ?? 0;
  const seatsUsed =
    !seatsUsedResult.error && typeof seatsUsedResult.data === "number"
      ? seatsUsedResult.data
      : activeMembers + pendingInvites;
  const seatLimit = entitlements.seatLimit;
  const seatsRemaining =
    seatLimit === null ? null : Math.max(seatLimit - seatsUsed, 0);
  const canAddSeat = seatLimit === null || seatsUsed < seatLimit;

  return {
    activeMembers,
    pendingInvites,
    seatsUsed,
    seatLimit,
    seatsRemaining,
    canAddSeat,
  };
}
