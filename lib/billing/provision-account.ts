import "server-only";

import type Stripe from "stripe";

import {
  completeCheckoutSession,
  upsertCheckoutSession,
  upsertOrganizationSubscription,
} from "@/lib/billing/admin-queries";
import type { SubscriptionStatus } from "@/lib/billing/types";
import { createAdminClient } from "@/lib/supabase/admin";

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "unpaid":
      return "unpaid";
    case "paused":
      return "paused";
    default:
      return "inactive";
  }
}

async function findUserIdByEmail(email: string) {
  const supabase = createAdminClient();
  const normalized = email.toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });

    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalized
    );

    if (match) {
      return match.id;
    }

    if (data.users.length < 200) {
      break;
    }
  }

  return null;
}

export async function provisionAccountFromCheckoutSession(
  session: Stripe.Checkout.Session
) {
  const email =
    session.customer_details?.email?.trim() ||
    session.customer_email?.trim() ||
    session.metadata?.email?.trim();

  if (!email) {
    throw new Error("Checkout session is missing a customer email.");
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    throw new Error("Checkout session is not paid.");
  }

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    throw new Error("Checkout session is missing Stripe customer or subscription.");
  }

  await upsertCheckoutSession({
    stripeCheckoutSessionId: session.id,
    email,
    status: "pending",
  });

  const supabase = createAdminClient();
  let userId = await findUserIdByEmail(email);
  let passwordSetupUrl: string | null = null;

  if (!userId) {
    const temporaryPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (createError) {
      throw new Error(createError.message);
    }

    userId = created.user.id;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
      },
    });

    if (linkError) {
      throw new Error(linkError.message);
    }

    passwordSetupUrl = linkData.properties?.action_link ?? null;
  }

  const { data, error } = await supabase.rpc("ensure_user_organization", {
    p_user_id: userId,
    p_email: email,
    p_company_name: "Your Company",
  });

  if (error) {
    throw new Error(error.message);
  }

  const organizationId = data as string;

  await upsertOrganizationSubscription({
    organizationId,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId: session.metadata?.price_id ?? process.env.STRIPE_PRICE_ID ?? null,
    status: "active",
    currentPeriodStart: session.created ? new Date(session.created * 1000) : new Date(),
    cancelAtPeriodEnd: false,
  });

  await completeCheckoutSession({
    stripeCheckoutSessionId: session.id,
    userId,
    organizationId,
  });

  return {
    userId,
    organizationId,
    email,
    passwordSetupUrl,
  };
}

export function subscriptionFromStripe(stripeSubscription: Stripe.Subscription) {
  return {
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId:
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer.id,
    stripePriceId: stripeSubscription.items.data[0]?.price.id ?? null,
    status: mapStripeSubscriptionStatus(stripeSubscription.status),
    currentPeriodStart: stripeSubscription.current_period_start
      ? new Date(stripeSubscription.current_period_start * 1000)
      : null,
    currentPeriodEnd: stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    canceledAt: stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : null,
  };
}

export { mapStripeSubscriptionStatus };
