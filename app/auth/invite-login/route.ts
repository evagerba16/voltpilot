import { revalidatePath } from "next/cache";
import { type NextRequest } from "next/server";

import { buildInviteSwitchLoginHref } from "@/lib/auth/invite-login";
import {
  PENDING_INVITE_TOKEN_COOKIE,
  PENDING_INVITE_COOKIE_OPTIONS,
} from "@/lib/teams/pending-invite-cookie";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler-client";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "");
  const loginHref = buildInviteSwitchLoginHref(token, email);

  const loginUrl = new URL(loginHref, request.url);
  const { supabase, getResponse } = createSupabaseRouteHandlerClient(
    request,
    () => loginUrl
  );

  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  const response = getResponse();
  response.cookies.set(PENDING_INVITE_TOKEN_COOKIE, "", {
    ...PENDING_INVITE_COOKIE_OPTIONS,
    maxAge: 0,
  });

  return response;
}
