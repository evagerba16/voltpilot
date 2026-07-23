import Link from "next/link";
import { Check, Zap } from "lucide-react";

import { SubscribeCheckoutButton } from "@/components/subscribe/subscribe-checkout-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { buttonVariants } from "@/components/ui/button-variants";
import { getSubscribePlanDetails } from "@/lib/billing/plan";
import { cn } from "@/lib/utils";

type SubscribePageProps = {
  searchParams: Promise<{ canceled?: string; error?: string }>;
};

const included = [
  "Customer, project, estimate, and proposal workflow",
  "AI estimate review and assistant",
  "Customer portal with e-signature",
  "Analytics dashboard and team management",
];

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  const params = await searchParams;
  const plan = await getSubscribePlanDetails();

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          VoltPilot
        </Link>

        {params.error ? (
          <AlertBanner variant="info" title="Account creation moved" className="mb-6">
            {params.error}
          </AlertBanner>
        ) : null}

        {params.canceled ? (
          <AlertBanner variant="info" title="Checkout canceled" className="mb-6">
            No account was created. You can restart checkout when you are ready.
          </AlertBanner>
        ) : null}

        {!plan.isConfigured ? (
          <AlertBanner variant="error" title="Billing unavailable" className="mb-6">
            Subscription checkout is not configured yet. Contact support.
          </AlertBanner>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Subscribe
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Start using VoltPilot
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Complete payment to create your account and organization. Team
              members you invite later are covered by your subscription.
            </p>

            <ul className="mt-8 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <h2 className="text-xl font-semibold">{plan.planName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plan.planDescription}</p>
            <p className="mt-6 text-4xl font-bold tracking-tight">
              ${plan.priceMonthly}
              <span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Billed monthly. Cancel anytime from your billing settings.
            </p>

            {plan.isConfigured ? (
              <SubscribeCheckoutButton className="mt-8 w-full" label="Subscribe" />
            ) : (
              <Link
                href="/"
                className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full")}
              >
                Back to home
              </Link>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Already subscribed?{" "}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
