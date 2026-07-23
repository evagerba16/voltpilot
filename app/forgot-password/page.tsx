import Link from "next/link";
import { Zap } from "lucide-react";

import { requestPasswordReset } from "@/app/auth/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { resolveAuthPageError } from "@/lib/auth/user-messages";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const errorMessage = resolveAuthPageError(params.error, "password_reset");

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
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the email for your VoltPilot account. We&apos;ll send a secure link
            to set a new password.
          </p>
        </div>

        {errorMessage ? (
          <AlertBanner variant="error" title="Unable to send reset email">
            {errorMessage}
          </AlertBanner>
        ) : null}

        {params.message === "reset_email_sent" ? (
          <AlertBanner variant="success" title="Check your email">
            If an account exists for that address, you&apos;ll receive a password reset
            link shortly. The link expires after a short time.
          </AlertBanner>
        ) : (
          <form className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <Button type="submit" formAction={requestPasswordReset} className="w-full">
              Send reset link
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
