import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createAdminClient();
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });

    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);

    if (match) {
      return match.id;
    }

    if (data.users.length < 200) {
      break;
    }
  }

  return null;
}

export async function authUserExistsForEmail(email: string): Promise<boolean> {
  return (await findAuthUserIdByEmail(email)) !== null;
}
