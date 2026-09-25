/**
 * Server-only service-role Supabase client. App Router, server actions, and API routes
 * must import from here — never from admin-client-core or admin-cli.
 */
import "server-only";

export {
  createAdminClientCore as createAdminClient,
  isAdminClientConfiguredCore as isAdminClientConfigured,
} from "@/lib/supabase/admin-client-core";
