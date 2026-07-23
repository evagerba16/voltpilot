import "server-only";

import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth/get-user";
import { PermissionDeniedError, AuthenticationRequiredError } from "@/lib/auth/permission-errors";
import { hasPermission } from "@/lib/teams/permissions";
import {
  buildTeamContext,
} from "@/lib/teams/queries";
import type { TeamContext, TeamPermission } from "@/lib/teams/types";

export async function getTeamContext(): Promise<TeamContext | null> {
  const user = await getUser();

  if (!user?.email) {
    return null;
  }

  return buildTeamContext(user.id, user.email);
}

export async function requireTeamContext() {
  const context = await getTeamContext();

  if (!context) {
    redirect("/login?next=/dashboard");
  }

  return context;
}

export async function requireTeamContextForApi() {
  const context = await getTeamContext();

  if (!context) {
    throw new AuthenticationRequiredError();
  }

  return context;
}

export async function requirePermission(permission: TeamPermission) {
  const context = await requireTeamContext();

  if (!hasPermission(context.permissions, permission)) {
    return { error: "You do not have permission to perform this action.", context };
  }

  return { context };
}

export async function requireApiPermission(permission: TeamPermission) {
  const context = await requireTeamContextForApi();

  if (!hasPermission(context.permissions, permission)) {
    return { error: "You do not have permission to perform this action.", context };
  }

  return { context };
}

export async function assertPermission(permission: TeamPermission) {
  const result = await requirePermission(permission);

  if ("error" in result && result.error) {
    throw new PermissionDeniedError(result.error);
  }

  return result.context;
}

export async function assertApiPermission(permission: TeamPermission) {
  const result = await requireApiPermission(permission);

  if ("error" in result && result.error) {
    throw new PermissionDeniedError(result.error);
  }

  return result.context;
}
