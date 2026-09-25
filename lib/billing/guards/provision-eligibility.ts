import { findAuthUserIdByEmailWithClient } from "@/lib/auth/find-auth-user-by-email-impl";
import { createAdminClient } from "@/lib/supabase/admin-cli";

function isStripeBilledCustomerId(stripeCustomerId: string | null | undefined) {
  if (!stripeCustomerId) {
    return false;
  }

  return (
    !stripeCustomerId.startsWith("manual_") && !stripeCustomerId.startsWith("legacy_")
  );
}

/** Block B2B provision when the owner email is tied to an Individual (Stripe) org. */
export async function assertOwnerEmailEligibleForB2BProvision(ownerEmail: string) {
  const admin = createAdminClient();
  const userId = await findAuthUserIdByEmailWithClient(admin, ownerEmail);

  if (!userId) {
    return;
  }

  const { data: memberships, error: memberError } = await admin
    .from("team_members")
    .select("organization_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (!memberships?.length) {
    return;
  }

  const organizationIds = memberships.map((row) => row.organization_id as string);

  const { data: subscriptions, error: subError } = await admin
    .from("organization_subscriptions")
    .select("organization_id, stripe_customer_id, status")
    .in("organization_id", organizationIds);

  if (subError) {
    throw new Error(subError.message);
  }

  for (const subscription of subscriptions ?? []) {
    if (
      subscription.status === "active" &&
      isStripeBilledCustomerId(subscription.stripe_customer_id as string)
    ) {
      throw new Error(
        "This owner email belongs to an active Individual (Stripe) VoltPilot account. Use a dedicated company owner email."
      );
    }
  }

  const { data: entitlements, error: entError } = await admin
    .from("organization_entitlements")
    .select("organization_id, plan_type")
    .in("organization_id", organizationIds);

  if (entError) {
    throw new Error(entError.message);
  }

  for (const entitlement of entitlements ?? []) {
    if (entitlement.plan_type === "b2b") {
      throw new Error(
        "This owner email is already tied to a B2B company workspace. Use a different owner email or provision from the original quote."
      );
    }
  }

  throw new Error(
    "This owner email already belongs to a VoltPilot organization. Use a dedicated company owner email."
  );
}
