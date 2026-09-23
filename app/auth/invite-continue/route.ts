import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { clearSupabaseAuthCookies } from "@/lib/auth/supabase-auth-cookies";
import { acceptTeamInvitationCore } from "@/lib/teams/accept-team-invitation-core";
import { applyInviteAcceptResponseCookies } from "@/lib/teams/invite-flow-response-cookies";
import {
  buildInviteSwitchLoginHref,
  buildLoginPageHref,
} from "@/lib/auth/invite-login";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { getInvitationByToken } from "@/lib/teams/queries";
import { setPendingInviteTokenOnResponse } from "@/lib/teams/pending-invite-cookie-response";

function emailsMatch(a: string | null | undefined, b: string) {
  return Boolean(a && a.toLowerCase() === b.toLowerCase());
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") ?? "").trim();

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let invitation;
  try {
    invitation = await getInvitationByToken(token);
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!invitation) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const invitedEmail = invitation.email.trim();
  const loginUrl = new URL(buildInviteSwitchLoginHref(token, invitedEmail), request.url);

  const dashboardUrl = new URL("/dashboard", request.url);
  const { supabase, getResponse, redirectTo } = createSupabaseRouteHandlerClient(
    request,
    () => loginUrl
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signOut();
    const response = getResponse();
    clearSupabaseAuthCookies(request, response);
    setPendingInviteTokenOnResponse(response, token);
    return response;
  }

  if (!emailsMatch(user.email, invitedEmail)) {
    await supabase.auth.signOut();
    revalidatePath("/", "layout");

    const response = getResponse();
    clearSupabaseAuthCookies(request, response);
    setPendingInviteTokenOnResponse(response, token);
    return response;
  }

  const result = await acceptTeamInvitationCore(supabase, user, token);

  if ("error" in result) {
    const errorLogin = new URL(
      buildLoginPageHref({
        error: result.error,
        next: `/invite/${token}`,
        email: invitedEmail,
        invite: true,
      }),
      request.url
    );
    const response = redirectTo(errorLogin);
    setPendingInviteTokenOnResponse(response, token);
    return response;
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings/team");
  revalidatePath("/dashboard");

  const response = redirectTo(dashboardUrl);
  applyInviteAcceptResponseCookies(response, result.organizationId);
  return response;
}
