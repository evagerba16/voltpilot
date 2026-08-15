"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  function clearStaleErrorState() {
    if (!error) {
      return;
    }

    setError(null);

    if (typeof window !== "undefined" && window.location.search.includes("error=")) {
      router.replace("/forgot-password", { scroll: false });
    }
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
            onChange={clearStaleErrorState}
            onInput={clearStaleErrorState}
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
