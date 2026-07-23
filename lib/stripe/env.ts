export function getStripeEnv() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();

  return {
    secretKey,
    webhookSecret,
    priceId,
    isConfigured: Boolean(secretKey && priceId),
  };
}

export function getStripePlanConfig() {
  const priceMonthly = Number(process.env.STRIPE_PLAN_PRICE_MONTHLY ?? "149");
  const planName = process.env.STRIPE_PLAN_NAME?.trim() || "VoltPilot Pro";
  const planDescription =
    process.env.STRIPE_PLAN_DESCRIPTION?.trim() ||
    "Full access to estimating, proposals, AI tools, analytics, and team management.";

  return {
    planName,
    planDescription,
    priceMonthly: Number.isFinite(priceMonthly) ? priceMonthly : 149,
    currency: "USD",
  };
}
