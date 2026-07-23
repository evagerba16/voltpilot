import { notFound } from "next/navigation";

import { InviteAcceptCard } from "@/components/settings/invite-accept-card";
import { getUser } from "@/lib/auth/get-user";
import { getInvitationByToken } from "@/lib/teams/queries";
import type { InvitableRole } from "@/lib/teams/types";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const [invitation, user] = await Promise.all([
    getInvitationByToken(token),
    getUser(),
  ]);

  if (!invitation) {
    notFound();
  }

  const organization = invitation.organization as { id: string; name: string };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <InviteAcceptCard
        token={token}
        organizationName={organization.name}
        role={invitation.role as InvitableRole}
        email={invitation.email}
        isAuthenticated={Boolean(user)}
        userEmail={user?.email}
      />
    </main>
  );
}
