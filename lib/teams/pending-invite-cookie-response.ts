import type { NextResponse } from "next/server";

import {
  PENDING_INVITE_COOKIE_OPTIONS,
  PENDING_INVITE_TOKEN_COOKIE,
} from "@/lib/teams/pending-invite-cookie";

export function setPendingInviteTokenOnResponse(response: NextResponse, token: string) {
  response.cookies.set(PENDING_INVITE_TOKEN_COOKIE, token, PENDING_INVITE_COOKIE_OPTIONS);
}

export function clearPendingInviteTokenOnResponse(response: NextResponse) {
  response.cookies.set(PENDING_INVITE_TOKEN_COOKIE, "", {
    ...PENDING_INVITE_COOKIE_OPTIONS,
    maxAge: 0,
  });
}
