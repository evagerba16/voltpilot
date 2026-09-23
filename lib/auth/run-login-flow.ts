import "server-only";

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import {
  buildLoginPageHref,
  extractInviteTokenFromPath,
  isInviteLoginReturnPath,
} from "@/lib/auth/invite-login";
import { resolveInviteSignInEmail } from "@/lib/auth/resolve-invite-sign-in-email";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { friendlyAuthError } from "@/lib/auth/user-messages";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { acceptTeamInvitationCore } from "@/lib/teams/accept-team-invitation-core";
import { applyInviteAcceptResponseCookies } from "@/lib/teams/invite-flow-response-cookies";

export async function runLoginFlow(
  request: NextRequest,
  formData: FormData
): Promise<NextResponse> {
  const submittedEmail = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(String(formData.get("next") ?? "/dashboard"));
  const fromInvite =
    isInviteLoginReturnPath(next) || String(formData.get("invite") ?? "") === "1";

  const { email, invitedEmail } = await resolveInviteSignInEmail(next, submittedEmail);
  const loginEmail = invitedEmail ?? email;

  const successPath = isInviteLoginReturnPath(next) ? "/dashboard" : next;
  const successUrl = new URL(successPath, request.url);

  const { supabase, getResponse, redirectTo } = createSupabaseRouteHandlerClient(
    request,
    () => successUrl
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  if (error) {
    const friendly = friendlyAuthError(error, "sign_in");
    const loginHref = buildLoginPageHref({
      error: friendly,
      next,
      email: loginEmail,
      invite: fromInvite,
      message:
        fromInvite && friendly.includes("didn't match")
          ? "This sign-in uses the invited email only. If you forgot the password, use Forgot password below."
          : undefined,
    });
    return NextResponse.redirect(new URL(loginHref, request.url), 303);
  }

  revalidatePath("/", "layout");

  if (isInviteLoginReturnPath(next)) {
    const inviteToken = extractInviteTokenFromPath(next);

    if (inviteToken) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const loginHref = buildLoginPageHref({
          error: "Sign in to accept this invitation.",
          next,
          email: loginEmail,
          invite: true,
        });
        return redirectTo(new URL(loginHref, request.url));
      }

      const acceptResult = await acceptTeamInvitationCore(supabase, user, inviteToken);

      if ("error" in acceptResult) {
        const loginHref = buildLoginPageHref({
          error: acceptResult.error,
          next,
          email: loginEmail,
          invite: true,
        });
        return redirectTo(new URL(loginHref, request.url));
      }

      revalidatePath("/settings/team");
      revalidatePath("/dashboard");

      const response = getResponse();
      applyInviteAcceptResponseCookies(response, acceptResult.organizationId);
      return response;
    }
  }

  return getResponse();
}
