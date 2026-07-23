import "server-only";

import Stripe from "stripe";

import { getStripeEnv } from "@/lib/stripe/env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const { secretKey, isConfigured } = getStripeEnv();

  if (!isConfigured || !secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }

  return stripeClient;
}
