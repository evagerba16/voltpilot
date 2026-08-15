import { NextResponse } from "next/server";

import {
  getMissingRecommendedProductionEnvVars,
  getMissingRequiredEnvVars,
} from "@/lib/env/validate";
import { logger } from "@/lib/observability/logger";
import { getStripeEnv } from "@/lib/stripe/env";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { isAdminClientConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isVerifiedResendFromAddress() {
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
  return Boolean(from) && !from.includes("resend.dev");
}

export async function GET() {
  const missingEnv = getMissingRequiredEnvVars();
  const missingRecommended = getMissingRecommendedProductionEnvVars();
  const supabase = getSupabaseEnv();
  const stripe = getStripeEnv();

  const checks = {
    env: missingEnv.length === 0,
    supabase: supabase.isConfigured,
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
    siteUrlNotLocalhost: !process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost"),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    resend: Boolean(process.env.RESEND_API_KEY?.trim()),
    resendDomain: isVerifiedResendFromAddress(),
    stripe: stripe.isConfigured,
    stripeWebhook: Boolean(stripe.webhookSecret),
    supabaseAdmin: isAdminClientConfigured(),
    sentry: Boolean(
      process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
    ),
  };

  const healthy =
    checks.env &&
    checks.supabase &&
    checks.siteUrl &&
    checks.stripe &&
    checks.stripeWebhook &&
    checks.supabaseAdmin &&
    checks.resend;

  if (!healthy) {
    logger.warn("health check degraded", { checks, missingEnv, missingRecommended });
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      missingEnv,
      missingRecommended,
    },
    { status: healthy ? 200 : 503 }
  );
}
