import "server-only";

import { cookies } from "next/headers";

import { ORGANIZATION_COOKIE_NAME } from "@/lib/teams/organization-cookie";

export const ORGANIZATION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export async function readOrganizationPreference() {
  const cookieStore = await cookies();
  return cookieStore.get(ORGANIZATION_COOKIE_NAME)?.value;
}
