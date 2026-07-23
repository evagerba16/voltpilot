"use server";

import { redirect } from "next/navigation";

import { getStripeClient } from "@/lib/stripe/client";
import { getStripeEnv } from "@/lib/stripe/env";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

export async function createCheckoutSession() {
  const { isConfigured, priceId } = getStripeEnv();
  const stripe = getStripeClient();

  if (!isConfigured || !stripe || !priceId) {
    return { error: "Billing is not configured. Contact support." };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${getSiteUrl()}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getSiteUrl()}/subscribe?canceled=1`,
    allow_promotion_codes: false,
    billing_address_collection: "auto",
    metadata: {
      price_id: priceId,
      product: "voltpilot_pro",
    },
  });

  if (!session.url) {
    return { error: "Unable to start checkout." };
  }

  redirect(session.url);
}
