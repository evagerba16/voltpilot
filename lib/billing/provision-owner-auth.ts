import { findAuthUserIdByEmailWithClient } from "@/lib/auth/find-auth-user-by-email-impl";
import { createAdminClient } from "@/lib/supabase/admin-cli";
import { getSiteUrl } from "@/lib/site-url";

export type EnsureOwnerAuthResult = {
  userId: string;
  email: string;
  createdUser: boolean;
  passwordSetupUrl: string | null;
};

function passwordSetupRedirectUrl() {
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
}

/** Find or create an auth user and mint a one-time password setup link (recovery flow). */
export async function ensureOwnerAuthWithPasswordSetupLink(
  emailRaw: string
): Promise<EnsureOwnerAuthResult> {
  const email = emailRaw.trim().toLowerCase();

  if (!email) {
    throw new Error("Owner email is required.");
  }

  const admin = createAdminClient();
  let userId = await findAuthUserIdByEmailWithClient(admin, email);
  let createdUser = false;

  if (!userId) {
    const temporaryPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (createError) {
      throw new Error(createError.message);
    }

    userId = created.user.id;
    createdUser = true;
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: passwordSetupRedirectUrl(),
    },
  });

  if (linkError) {
    throw new Error(linkError.message);
  }

  return {
    userId,
    email,
    createdUser,
    passwordSetupUrl: linkData.properties?.action_link ?? null,
  };
}
