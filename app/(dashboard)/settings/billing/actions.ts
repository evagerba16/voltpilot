"use server";

import { redirect } from "next/navigation";

import {
  getOrganizationEntitlements,
  isB2BOrganizationPlan,
} from "@/lib/billing/entitlements";
import { getOrganizationSubscription } from "@/lib/billing/queries";
import { assertPermission } from "@/lib/auth/get-team-context";
import { getStripeClient } from "@/lib/stripe/client";

import { getSiteUrl } from "@/lib/site-url";

export async function createBillingPortalSession() {
  const context = await assertPermission("settings.billing.manage");
  const [subscription, entitlements] = await Promise.all([
    getOrganizationSubscription(context.organizationId),
    getOrganizationEntitlements(context.organizationId),
  ]);

  if (isB2BOrganizationPlan(entitlements.planType)) {
    return {
      error:
        "Your VoltPilot account is managed through your company agreement. Contact your account administrator for billing changes.",
    };
  }
  const stripe = getStripeClient();

  if (
    !subscription?.stripe_customer_id ||
    subscription.stripe_customer_id.startsWith("legacy_") ||
    subscription.stripe_customer_id.startsWith("manual_")
  ) {
    return {
      error: subscription?.stripe_customer_id?.startsWith("manual_")
        ? "Your company plan is managed by VoltPilot. Contact support for billing changes."
        : "This organization uses legacy billing. Subscribe through checkout to connect Stripe billing.",
    };
  }

  if (!stripe) {
    return { error: "Billing is not configured." };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${getSiteUrl()}/settings/billing`,
  });

  if (!session.url) {
    return { error: "Unable to open billing portal." };
  }

  redirect(session.url);
}
