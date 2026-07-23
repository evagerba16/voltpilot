"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useTransition } from "react";

import { createBillingPortalSession } from "@/app/(dashboard)/settings/billing/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import type { OrganizationSubscription } from "@/lib/billing/types";
import { cardClassName } from "@/lib/ui/form-classes";

type BillingPanelProps = {
  subscription: OrganizationSubscription | null;
  planName: string;
  priceMonthly: number;
  canManage: boolean;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function BillingPanel({
  subscription,
  planName,
  priceMonthly,
  canManage,
}: BillingPanelProps) {
  const [pending, startTransition] = useTransition();
  const { error: toastError } = useToast();
  const isLegacy = subscription?.stripe_customer_id?.startsWith("legacy_");

  function openPortal() {
    startTransition(async () => {
      const result = await createBillingPortalSession();

      if (result?.error) {
        toastError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className={cardClassName}>
        <h2 className="text-lg font-semibold">Subscription</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Plan</dt>
            <dd className="mt-1 text-sm font-medium">{planName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Price</dt>
            <dd className="mt-1 text-sm font-medium">${priceMonthly}/month</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Status</dt>
            <dd className="mt-1 text-sm font-medium">
              {subscription ? formatStatus(subscription.status) : "Inactive"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Current period ends
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {formatDate(subscription?.current_period_end ?? null)}
            </dd>
          </div>
        </dl>

        {subscription?.cancel_at_period_end ? (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            Your subscription is set to cancel at the end of the current billing period.
          </p>
        ) : null}
      </div>

      <div className={cardClassName}>
        <h2 className="text-lg font-semibold">Billing management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Update your payment method, cancel your subscription, or view billing history in the
          secure Stripe customer portal.
        </p>

        {canManage ? (
          <Button
            type="button"
            className="mt-4"
            disabled={pending || isLegacy}
            onClick={openPortal}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                Opening portal...
              </>
            ) : (
              <>
                Manage billing
                <ExternalLink className="size-4" data-icon="inline-end" />
              </>
            )}
          </Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Contact your organization owner to manage billing.
          </p>
        )}

        {isLegacy ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This organization was created before Stripe billing was enabled. Complete a new
            checkout to connect a paid subscription.
          </p>
        ) : null}
      </div>
    </div>
  );
}
