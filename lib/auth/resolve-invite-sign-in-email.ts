import "server-only";

import { extractInviteTokenFromPath, isInviteLoginReturnPath } from "@/lib/auth/invite-login";
import { getInvitationByToken } from "@/lib/teams/queries";

/** Invite login always signs in as the invitation email (immune to browser autofill). */
export async function resolveInviteSignInEmail(
  next: string,
  submittedEmail: string
): Promise<{ email: string; invitedEmail?: string; token?: string }> {
  if (!isInviteLoginReturnPath(next)) {
    return { email: submittedEmail.trim() };
  }

  const token = extractInviteTokenFromPath(next);

  if (!token) {
    return { email: submittedEmail.trim() };
  }

  try {
    const invitation = await getInvitationByToken(token);

    if (!invitation?.email) {
      return { email: submittedEmail.trim(), token };
    }

    const invitedEmail = invitation.email.trim();
    return { email: invitedEmail, invitedEmail, token };
  } catch {
    return { email: submittedEmail.trim(), token };
  }
}
