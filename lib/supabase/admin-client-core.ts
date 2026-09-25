import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

/** Shared Supabase service-role client factory (no server-only guard — import via admin.ts or admin-cli.ts). */
export function createAdminClientCore() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin client is not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isAdminClientConfiguredCore() {
  return Boolean(
    getSupabaseEnv().url && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}
