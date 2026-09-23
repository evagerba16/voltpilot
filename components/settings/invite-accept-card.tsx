import { Button } from "@/components/ui/button";
import { TEAM_ROLE_LABELS, type InvitableRole } from "@/lib/teams/types";

type InviteAcceptCardProps = {
  token: string;
  organizationName: string;
  role: InvitableRole;
  email: string;
  error?: string | null;
};

export function InviteAcceptCard({
  token,
  organizationName,
  role,
  email,
  error: initialError = null,
}: InviteAcceptCardProps) {
  const displayError = initialError;

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

      <div className="mt-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-medium">Create your account</h2>
          <p className="text-sm text-muted-foreground">
            Set a password for {email} to join {organizationName}. No subscription
            required — your team&apos;s plan covers you.
          </p>
        </div>

        <form action="/auth/invite-signup" method="POST" className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              value={email}
              readOnly
              tabIndex={-1}
              className="flex h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="invite-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="invite-password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="invite-confirm-password" className="text-sm font-medium">
              Confirm password
            </label>
            <input
              id="invite-confirm-password"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <Button type="submit" className="w-full">
            Create account and join
          </Button>
        </form>
      </div>

      {displayError ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
