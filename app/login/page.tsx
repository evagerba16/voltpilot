import Link from "next/link";
import { Zap } from "lucide-react";

import { signIn } from "@/app/auth/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { resolveAuthPageError } from "@/lib/auth/user-messages";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/dashboard";
  const errorMessage = resolveAuthPageError(params.error, "sign_in");

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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your VoltPilot account. New customers subscribe first, then set
            up their password from email.
          </p>
        </div>

        {errorMessage ? (
          <AlertBanner variant="error" title="Sign in failed">
            {errorMessage}
          </AlertBanner>
        ) : null}

        {params.message === "password_updated" ? (
          <AlertBanner variant="success" title="Password updated">
            Your password was updated successfully. Sign in with your new password.
          </AlertBanner>
        ) : null}

        <form className="space-y-4">
          <input type="hidden" name="next" value={next} />
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={6}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <Button type="submit" formAction={signIn} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link href="/subscribe" className="font-medium text-foreground underline-offset-4 hover:underline">
            Subscribe
          </Link>
        </p>
      </div>
    </main>
  );
}
