import { validateRequiredEnv } from "@/lib/env/validate";

export async function register() {
  // Warn only — middleware and Supabase clients already degrade gracefully when
  // env vars are missing. Throwing here breaks every request (including Edge
  // middleware) before the app can serve public pages or redirect to login.
  validateRequiredEnv({ strict: false });
}
