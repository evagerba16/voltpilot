"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { createCheckoutSession } from "@/app/subscribe/actions";
import { Button } from "@/components/ui/button";

type SubscribeCheckoutButtonProps = {
  label?: string;
  className?: string;
};

export function SubscribeCheckoutButton({
  label = "Subscribe",
  className,
}: SubscribeCheckoutButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        className={className}
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createCheckoutSession();

            if (result?.error) {
              setError(result.error);
            }
          });
        }}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            Redirecting to checkout...
          </>
        ) : (
          label
        )}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
