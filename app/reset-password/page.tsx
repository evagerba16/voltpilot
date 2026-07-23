import Link from "next/link";
import { Zap } from "lucide-react";

import { updatePassword } from "@/app/auth/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/get-user";
import { resolveAuthPageError } from "@/lib/auth/user-messages";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const user = await getUser();
  const hasValidSession = Boolean(user);
  const errorMessage = resolveAuthPageError(params.error, "update_password");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="size-4" />
        </span>
        VoltPilot
      </Link>

      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a new password for your VoltPilot account.
          </p>
        </div>

        {errorMessage ? (
          <AlertBanner variant="error" title="Unable to update password">
            {errorMessage}
          </AlertBanner>
        ) : null}

        {!hasValidSession ? (
          <AlertBanner variant="error" title="Reset link required">
            Open the password reset link from your email to continue. Links expire
            after a short time.
          </AlertBanner>
        ) : (
          <form className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
                autoFocus
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <Button type="submit" formAction={updatePassword} className="w-full">
              Update password
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {hasValidSession ? (
            <>
              Wrong account?{" "}
              <Link
                href="/forgot-password"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Request a new link
              </Link>
            </>
          ) : (
            <>
              Need a new link?{" "}
              <Link
                href="/forgot-password"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Reset password
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
