/**
 * Service-role Supabase client for local ops scripts only (tsx / node --env-file).
 * Do not import from App Router pages, client components, or API routes — use @/lib/supabase/admin.
 */
export {
  createAdminClientCore as createAdminClient,
  isAdminClientConfiguredCore as isAdminClientConfigured,
} from "@/lib/supabase/admin-client-core";
