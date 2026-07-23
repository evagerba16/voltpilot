const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const PRODUCTION_RECOMMENDED_ENV_VARS = [
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "RESEND_API_KEY",
] as const;

export function getMissingRecommendedProductionEnvVars(): string[] {
  if (process.env.NODE_ENV !== "production") {
    return [];
  }

  return PRODUCTION_RECOMMENDED_ENV_VARS.filter((key) => !process.env[key]?.trim());
}

export function getMissingRequiredEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());
}

export function validateRequiredEnv(options?: { strict?: boolean }) {
  const missing = getMissingRequiredEnvVars();
  const strict = options?.strict ?? process.env.NODE_ENV === "production";

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env.local and set Supabase credentials.`;

    if (strict) {
      throw new Error(message);
    }

    console.warn(`[VoltPilot] ${message}`);
  }

  const missingRecommended = getMissingRecommendedProductionEnvVars();

  if (missingRecommended.length > 0) {
    console.warn(
      `[VoltPilot] Missing recommended production environment variables: ${missingRecommended.join(", ")}`
    );
  }
}
