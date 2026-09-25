import "server-only";

import { findAuthUserIdByEmailWithClient } from "@/lib/auth/find-auth-user-by-email-impl";
import { createAdminClient } from "@/lib/supabase/admin";

export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  return findAuthUserIdByEmailWithClient(createAdminClient(), email);
}

export async function authUserExistsForEmail(email: string): Promise<boolean> {
  return (await findAuthUserIdByEmail(email)) !== null;
}
