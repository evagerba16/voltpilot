"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";

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

  return (
    <Button
      type="button"
      size="lg"
      className={className}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await createCheckoutSession();
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
  );
}
