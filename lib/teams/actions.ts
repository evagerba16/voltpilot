"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/get-user";
import {
  ORGANIZATION_COOKIE_NAME,
} from "@/lib/teams/organization-cookie";
import {
  ORGANIZATION_COOKIE_OPTIONS,
} from "@/lib/teams/organization-preference";
import { getTeamMembership } from "@/lib/teams/queries";

async function writeOrganizationPreference(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ORGANIZATION_COOKIE_NAME, organizationId, ORGANIZATION_COOKIE_OPTIONS);
}

async function assertActiveMembership(organizationId: string) {
  const user = await getUser();

  if (!user?.id) {
    return { error: "Not authenticated." as const };
  }

  const membership = await getTeamMembership(user.id, organizationId);

  if (!membership) {
    return { error: "Organization not found." as const };
  }

  return { userId: user.id };
}

export async function syncOrganizationPreference(organizationId: string) {
  const access = await assertActiveMembership(organizationId);

  if ("error" in access) {
    return access;
  }

  await writeOrganizationPreference(organizationId);
  return { success: true as const };
}

export async function switchOrganization(organizationId: string) {
  const access = await assertActiveMembership(organizationId);

  if ("error" in access) {
    return access;
  }

  await writeOrganizationPreference(organizationId);
  revalidatePath("/", "layout");
  return { success: true as const };
}

export async function persistOrganizationPreference(organizationId: string) {
  await writeOrganizationPreference(organizationId);
  return { success: true as const };
}
