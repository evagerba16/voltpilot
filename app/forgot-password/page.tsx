import Link from "next/link";
import { Zap } from "lucide-react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AlertBanner } from "@/components/ui/alert-banner";
import { resolveAuthPageError } from "@/lib/auth/user-messages";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    attempt?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const resetAttempted = params.attempt === "1";
  const errorMessage = resetAttempted
    ? resolveAuthPageError(params.error, "password_reset")
    : null;

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

        {params.message === "reset_email_sent" ? (
          <AlertBanner variant="success" title="Check your email">
            If an account exists for that address, you&apos;ll receive a password reset
            link shortly. The link expires after a short time.
          </AlertBanner>
        ) : (
          <ForgotPasswordForm initialError={errorMessage} />
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
