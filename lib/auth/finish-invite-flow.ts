import "server-only";

import { redirect } from "next/navigation";

import { acceptTeamInvitation } from "@/app/(dashboard)/settings/team/actions";
import {
  buildLoginPageHref,
  extractInviteTokenFromPath,
} from "@/lib/auth/invite-login";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { writePendingInviteToken } from "@/lib/teams/pending-invite-cookie";

/** After auth succeeds, accept a pending invite in `next` and land on the dashboard. */
export async function finishInviteFlowAfterAuth(next: string, email: string): Promise<never> {
  const inviteToken = extractInviteTokenFromPath(next);

  if (!inviteToken) {
    redirect(safeRedirectPath(next));
  }

  await writePendingInviteToken(inviteToken);

  const result = await acceptTeamInvitation(inviteToken);

  if ("error" in result) {
    redirect(
      buildLoginPageHref({
        error: result.error,
        next,
        email,
        invite: true,
      })
    );
  }

  redirect("/dashboard");
}
