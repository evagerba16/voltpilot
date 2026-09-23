import "server-only";

import type { NextResponse } from "next/server";

import { ORGANIZATION_COOKIE_NAME } from "@/lib/teams/organization-cookie";
import { ORGANIZATION_COOKIE_OPTIONS } from "@/lib/teams/organization-preference";
import {
  PENDING_INVITE_TOKEN_COOKIE,
  PENDING_INVITE_COOKIE_OPTIONS,
} from "@/lib/teams/pending-invite-cookie";

export function applyInviteAcceptResponseCookies(
  response: NextResponse,
  organizationId?: string
) {
  if (organizationId) {
    response.cookies.set(ORGANIZATION_COOKIE_NAME, organizationId, ORGANIZATION_COOKIE_OPTIONS);
  }

  response.cookies.set(PENDING_INVITE_TOKEN_COOKIE, "", {
    ...PENDING_INVITE_COOKIE_OPTIONS,
    maxAge: 0,
  });
}
