import { notFound } from "next/navigation";

import { InviteAcceptCard } from "@/components/settings/invite-accept-card";
import { InviteHardRedirect } from "@/components/settings/invite-hard-redirect";
import { authUserExistsForEmail } from "@/lib/auth/find-auth-user-by-email";
import { buildInviteSwitchAccountHref } from "@/lib/auth/invite-login";
import { getUser } from "@/lib/auth/get-user";
import { getInvitationByToken } from "@/lib/teams/queries";
import type { InvitableRole } from "@/lib/teams/types";

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  const query = await searchParams;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  const invitedEmail = invitation.email.trim();
  const [user, inviteEmailHasAuthAccount] = await Promise.all([
    getUser(),
    authUserExistsForEmail(invitedEmail),
  ]);

  const organization = invitation.organization as { id: string; name: string };

  if (user || inviteEmailHasAuthAccount) {
    return (
      <InviteHardRedirect href={buildInviteSwitchAccountHref(token, invitedEmail)} />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <InviteAcceptCard
        token={token}
        organizationName={organization.name}
        role={invitation.role as InvitableRole}
        email={invitedEmail}
        error={query.error}
      />
    </main>
  );
}
