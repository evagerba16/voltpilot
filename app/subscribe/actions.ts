"use server";

import { redirect } from "next/navigation";

import { getStripeClient } from "@/lib/stripe/client";
import { getStripeEnv } from "@/lib/stripe/env";
import { getSiteUrl } from "@/lib/site-url";

export async function createCheckoutSession() {
  const { isConfigured, priceId } = getStripeEnv();
  const stripe = getStripeClient();

  if (!isConfigured || !stripe || !priceId) {
    return { error: "Billing is not configured. Contact support." };
  }

  try {
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
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Unable to start checkout.";
    return { error: message };
  }
}
