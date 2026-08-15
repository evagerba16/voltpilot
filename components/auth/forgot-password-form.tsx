"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { requestPasswordReset } from "@/app/auth/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";

type ForgotPasswordFormProps = {
  initialError: string | null;
};

export function ForgotPasswordForm({ initialError }: ForgotPasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [email, setEmail] = useState("");

  function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextEmail = event.target.value;
    setEmail(nextEmail);

    if (error === null) {
      return;
    }

    setError(null);

    if (typeof window === "undefined") {
      return;
    }

    const { pathname, search } = window.location;
    if (!search.includes("error=") && !search.includes("attempt=")) {
      return;
    }

    // Strip stale params synchronously so remounts during soft navigation
    // never rehydrate the error from the old URL.
    window.history.replaceState(null, "", pathname);
    router.replace(pathname, { scroll: false });
  }

  return (
    <>
      {error ? (
        <AlertBanner variant="error" title="Unable to send reset email">
          {error}
        </AlertBanner>
      ) : null}

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
            value={email}
            onChange={handleEmailChange}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <Button type="submit" formAction={requestPasswordReset} className="w-full">
          Send reset link
        </Button>
      </form>
    </>
  );
}
