import { NextResponse } from "next/server";

import { getMissingRequiredEnvVars } from "@/lib/env/validate";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

export async function GET() {
  const missingEnv = getMissingRequiredEnvVars();
  const supabase = getSupabaseEnv();

  const checks = {
    env: missingEnv.length === 0,
    supabase: supabase.isConfigured,
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    resend: Boolean(process.env.RESEND_API_KEY?.trim()),
  };

  const healthy = checks.env && checks.supabase;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      missingEnv,
    },
    { status: healthy ? 200 : 503 }
  );
}
