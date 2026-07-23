import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CheckoutSessionStatus,
  OrganizationSubscription,
  SubscriptionStatus,
} from "@/lib/billing/types";

export async function upsertCheckoutSession(input: {
  stripeCheckoutSessionId: string;
  email: string;
  status?: CheckoutSessionStatus;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stripe_checkout_sessions")
    .upsert(
      {
        stripe_checkout_session_id: input.stripeCheckoutSessionId,
        email: input.email.toLowerCase(),
        status: input.status ?? "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_checkout_session_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function completeCheckoutSession(input: {
  stripeCheckoutSessionId: string;
  userId: string;
  organizationId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("stripe_checkout_sessions")
    .update({
      status: "completed",
      user_id: input.userId,
      organization_id: input.organizationId,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertOrganizationSubscription(input: {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  status: SubscriptionStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organization_subscriptions")
    .upsert(
      {
        organization_id: input.organizationId,
        stripe_customer_id: input.stripeCustomerId,
        stripe_subscription_id: input.stripeSubscriptionId ?? null,
        stripe_price_id: input.stripePriceId ?? null,
        status: input.status,
        current_period_start: input.currentPeriodStart?.toISOString() ?? null,
        current_period_end: input.currentPeriodEnd?.toISOString() ?? null,
        cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
        canceled_at: input.canceledAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as OrganizationSubscription;
}

export async function updateSubscriptionByStripeId(input: {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId?: string | null;
  status: SubscriptionStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organization_subscriptions")
    .update({
      stripe_customer_id: input.stripeCustomerId,
      stripe_price_id: input.stripePriceId ?? null,
      status: input.status,
      current_period_start: input.currentPeriodStart?.toISOString() ?? null,
      current_period_end: input.currentPeriodEnd?.toISOString() ?? null,
      cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
      canceled_at: input.canceledAt?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", input.stripeSubscriptionId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as OrganizationSubscription | null) ?? null;
}
