import { getStripeEnv, getStripePlanConfig } from "@/lib/stripe/env";

export function getSubscribePlanDetails() {
  const { isConfigured } = getStripeEnv();
  const plan = getStripePlanConfig();

  return {
    ...plan,
    isConfigured,
  };
}
