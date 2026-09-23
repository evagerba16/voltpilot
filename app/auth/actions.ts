"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTeamContext } from "@/lib/auth/get-team-context";
import { friendlyAuthError } from "@/lib/auth/user-messages";
import { finishInviteFlowAfterAuth } from "@/lib/auth/finish-invite-flow";
import {
  buildLoginPageHref,
  isInviteLoginReturnPath,
} from "@/lib/auth/invite-login";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { persistOrganizationPreference } from "@/lib/teams/actions";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

function getAuthSiteUrl() {
  return getSiteUrl();
}

function buildForgotPasswordReturnPath(formData: FormData, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  const email = String(formData.get("email") ?? "").trim();
  const next = safeRedirectPath(String(formData.get("next") ?? "/login"));

  if (email) {
    params.set("email", email);
  }

  if (next && next !== "/login") {
    params.set("next", next);
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/forgot-password?${query}` : "/forgot-password";
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(buildForgotPasswordReturnPath(formData));
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthSiteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  if (error) {
    redirect(
      buildForgotPasswordReturnPath(formData, {
        attempt: "1",
        error: friendlyAuthError(error, "password_reset"),
      })
    );
  }

  redirect(buildForgotPasswordReturnPath(formData, { message: "reset_email_sent" }));
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password must be at least 6 characters.")}`
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Passwords do not match.")}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Your reset link expired or is invalid. Request a new one.")}`
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      `/reset-password?error=${encodeURIComponent(friendlyAuthError(error, "update_password"))}`
    );
  }

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login?message=password_updated");
}

export async function signUp(formData: FormData) {
  void formData;
  redirect(
    `/subscribe?error=${encodeURIComponent("Create your account by completing subscription checkout.")}`
  );
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      buildLoginPageHref({
        error: friendlyAuthError(error, "sign_in"),
        next: String(formData.get("next") ?? "/dashboard"),
        email: String(formData.get("email") ?? ""),
      })
    );
  }

  revalidatePath("/", "layout");

  const context = await getTeamContext();

  if (context?.organizationId) {
    await persistOrganizationPreference(context.organizationId);
  }

  const next = safeRedirectPath(String(formData.get("next") ?? "/dashboard"));
  if (isInviteLoginReturnPath(next)) {
    await finishInviteFlowAfterAuth(next, email);
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}

