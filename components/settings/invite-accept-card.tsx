"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { acceptTeamInvitation } from "@/app/(dashboard)/settings/team/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { TEAM_ROLE_LABELS, type InvitableRole } from "@/lib/teams/types";

type InviteAcceptCardProps = {
  token: string;
  organizationName: string;
  role: InvitableRole;
  email: string;
  isAuthenticated: boolean;
  userEmail?: string | null;
};

export function InviteAcceptCard({
  token,
  organizationName,
  role,
  email,
  isAuthenticated,
  userEmail,
}: InviteAcceptCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const emailMatches =
    isAuthenticated &&
    userEmail &&
    userEmail.toLowerCase() === email.toLowerCase();

  function handleAccept() {
    setError(null);

    startTransition(async () => {
      const result = await acceptTeamInvitation(token);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Join {organizationName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You have been invited to collaborate on VoltPilot as{" "}
        <span className="font-medium text-foreground">{TEAM_ROLE_LABELS[role]}</span>.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
        <p>
          <span className="text-muted-foreground">Invitation sent to:</span>{" "}
          {email}
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in or create an account with {email} to accept this invitation.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            className={buttonVariants({ className: "w-full" })}
          >
            Sign in to accept
          </Link>
        </div>
      ) : !emailMatches ? (
        <div className="mt-6 space-y-3">
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            You are signed in as {userEmail}. Sign in with {email} to accept this
            invitation.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Switch account
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <Button onClick={handleAccept} disabled={pending} className="w-full">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                Accepting...
              </>
            ) : (
              "Accept invitation"
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Accepting grants you access based on your assigned role. You can leave the
            organization later by contacting an admin.
          </p>
        </div>
      )}

      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
