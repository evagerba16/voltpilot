import "server-only";

import { cookies } from "next/headers";

export const PENDING_INVITE_TOKEN_COOKIE = "vp_pending_invite_token";

export const PENDING_INVITE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export async function readPendingInviteToken() {
  const cookieStore = await cookies();
  return cookieStore.get(PENDING_INVITE_TOKEN_COOKIE)?.value ?? null;
}

export async function writePendingInviteToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_INVITE_TOKEN_COOKIE, token, PENDING_INVITE_COOKIE_OPTIONS);
}

export async function clearPendingInviteToken() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_INVITE_TOKEN_COOKIE);
}
