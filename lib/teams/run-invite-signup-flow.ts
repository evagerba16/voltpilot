import "server-only";

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { authUserExistsForEmail } from "@/lib/auth/find-auth-user-by-email";
import { buildInviteLoginHref } from "@/lib/auth/invite-login";
import { friendlyAuthError } from "@/lib/auth/user-messages";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { acceptTeamInvitationCore } from "@/lib/teams/accept-team-invitation-core";
import { applyInviteAcceptResponseCookies } from "@/lib/teams/invite-flow-response-cookies";
import { getInvitationByToken } from "@/lib/teams/queries";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function runInviteSignupFlow(
  request: NextRequest,
  formData: FormData
): Promise<NextResponse> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const inviteErrorRedirect = (error: string) => {
    const inviteUrl = new URL(`/invite/${token}`, request.url);
    inviteUrl.searchParams.set("error", error);
    return NextResponse.redirect(inviteUrl, 303);
  };

  if (!token) {
    return inviteErrorRedirect("This invitation link is invalid.");
  }

  if (password.length < 6) {
    return inviteErrorRedirect("Password must be at least 6 characters.");
  }

  if (password !== confirmPassword) {
    return inviteErrorRedirect("Passwords do not match.");
  }

  let invitation;

  try {
    invitation = await getInvitationByToken(token);
  } catch {
    return inviteErrorRedirect("We couldn't verify this invitation. Try again in a moment.");
  }

  if (!invitation) {
    return inviteErrorRedirect("This invitation is invalid or has expired.");
  }

  const invitedEmail = invitation.email.trim();

  if (await authUserExistsForEmail(invitedEmail)) {
    return NextResponse.redirect(
      new URL(buildInviteLoginHref(token, invitedEmail), request.url),
      303
    );
  }

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: invitedEmail,
    password,
    email_confirm: true,
  });

  if (createError) {
    return inviteErrorRedirect(mapSignUpError(createError.message));
  }

  const dashboardUrl = new URL("/dashboard", request.url);
  const { supabase, getResponse, redirectTo } = createSupabaseRouteHandlerClient(
    request,
    () => dashboardUrl
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invitedEmail,
    password,
  });

  if (signInError) {
    return NextResponse.redirect(
      new URL(buildInviteLoginHref(token, invitedEmail), request.url),
      303
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(buildInviteLoginHref(token, invitedEmail), request.url),
      303
    );
  }

  const acceptResult = await acceptTeamInvitationCore(supabase, user, token);

  if ("error" in acceptResult) {
    const loginHref = buildInviteLoginHref(token, invitedEmail);
    const loginUrl = new URL(loginHref, request.url);
    loginUrl.searchParams.set("error", acceptResult.error);
    return redirectTo(loginUrl);
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings/team");
  revalidatePath("/dashboard");

  const response = getResponse();
  applyInviteAcceptResponseCookies(response, acceptResult.organizationId);
  return response;
}
