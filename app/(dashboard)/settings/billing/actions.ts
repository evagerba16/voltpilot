"use server";

import { redirect } from "next/navigation";

import { getOrganizationSubscription } from "@/lib/billing/queries";
import { assertPermission } from "@/lib/auth/get-team-context";
import { getStripeClient } from "@/lib/stripe/client";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

export async function createBillingPortalSession() {
  const context = await assertPermission("settings.billing.manage");
  const subscription = await getOrganizationSubscription(context.organizationId);
  const stripe = getStripeClient();

  if (!subscription?.stripe_customer_id || subscription.stripe_customer_id.startsWith("legacy_")) {
    return {
      error:
        "This organization uses legacy billing. Subscribe through checkout to connect Stripe billing.",
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
