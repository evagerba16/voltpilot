import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { buildLoginPageHref } from "@/lib/auth/invite-login";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { acceptTeamInvitationCore } from "@/lib/teams/accept-team-invitation-core";
import { applyInviteAcceptResponseCookies } from "@/lib/teams/invite-flow-response-cookies";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") ?? "").trim();

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const dashboardUrl = new URL("/dashboard", request.url);
  const { supabase, getResponse, redirectTo } = createSupabaseRouteHandlerClient(
    request,
    () => dashboardUrl
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginHref = buildLoginPageHref({
      error: "Sign in to accept this invitation.",
      next: `/invite/${token}`,
      invite: true,
    });
    return redirectTo(new URL(loginHref, request.url));
  }

  const result = await acceptTeamInvitationCore(supabase, user, token);

  if ("error" in result) {
    const loginHref = buildLoginPageHref({
      error: result.error,
      next: `/invite/${token}`,
      invite: true,
    });
    return redirectTo(new URL(loginHref, request.url));
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings/team");
  revalidatePath("/dashboard");

  const response = getResponse();
  applyInviteAcceptResponseCookies(response, result.organizationId);
  return response;
}
