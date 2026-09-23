import "server-only";

import { revalidatePath } from "next/cache";

import { acceptTeamInvitation } from "@/app/(dashboard)/settings/team/actions";
import { authUserExistsForEmail } from "@/lib/auth/find-auth-user-by-email";
import { buildInviteLoginHref } from "@/lib/auth/invite-login";
import { friendlyAuthError } from "@/lib/auth/user-messages";
import { writePendingInviteToken } from "@/lib/teams/pending-invite-cookie";
import { getInvitationByToken } from "@/lib/teams/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function mapSignUpError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already exists")
  ) {
    return "An account with this email already exists. Sign in to accept the invitation.";
  }

  return friendlyAuthError({ message }, "sign_in");
}

export async function runInviteSignup(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "This invitation link is invalid.", token: "" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters.", token };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", token };
  }

  let invitation;

  try {
    invitation = await getInvitationByToken(token);
  } catch {
    return { error: "We couldn't verify this invitation. Try again in a moment.", token };
  }

  if (!invitation) {
    return { error: "This invitation is invalid or has expired.", token };
  }

  if (await authUserExistsForEmail(invitation.email)) {
    return {
      redirectToLogin: buildInviteLoginHref(token, invitation.email),
      token,
    };
  }

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return { error: mapSignUpError(createError.message), token };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invitation.email,
    password,
  });

  if (signInError) {
    return { error: mapSignUpError(signInError.message), token };
  }

  await writePendingInviteToken(token);

  revalidatePath("/", "layout");

  const result = await acceptTeamInvitation(token);

  if ("error" in result) {
    return { error: result.error, token };
  }

  return { success: true as const, token };
}
