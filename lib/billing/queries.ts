import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  OrganizationSubscription,
  StripeCheckoutSessionRecord,
  SubscriptionStatus,
} from "@/lib/billing/types";

export function isSubscriptionActive(status: SubscriptionStatus) {
  return status === "active" || status === "past_due";
}

export async function getOrganizationSubscription(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("organization_subscriptions")) {
      return null;
    }

    throw new Error(error.message);
  }

  return (data as OrganizationSubscription | null) ?? null;
}

export async function getCheckoutSessionByStripeId(stripeCheckoutSessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stripe_checkout_sessions")
    .select("*")
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as StripeCheckoutSessionRecord | null) ?? null;
}

export async function getSubscriptionByStripeCustomerId(stripeCustomerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_subscriptions")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as OrganizationSubscription | null) ?? null;
}
