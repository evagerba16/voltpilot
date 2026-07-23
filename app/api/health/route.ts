import { NextResponse } from "next/server";

import {
  getMissingRecommendedProductionEnvVars,
  getMissingRequiredEnvVars,
} from "@/lib/env/validate";
import { getStripeEnv } from "@/lib/stripe/env";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { isAdminClientConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const missingEnv = getMissingRequiredEnvVars();
  const missingRecommended = getMissingRecommendedProductionEnvVars();
  const supabase = getSupabaseEnv();
  const stripe = getStripeEnv();

  const checks = {
    env: missingEnv.length === 0,
    supabase: supabase.isConfigured,
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    resend: Boolean(process.env.RESEND_API_KEY?.trim()),
    stripe: stripe.isConfigured,
    stripeWebhook: Boolean(stripe.webhookSecret),
    supabaseAdmin: isAdminClientConfigured(),
  };

  const healthy =
    checks.env &&
    checks.supabase &&
    checks.siteUrl &&
    checks.stripe &&
    checks.stripeWebhook &&
    checks.supabaseAdmin &&
    checks.resend;

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
