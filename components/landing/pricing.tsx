import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { SubscribeCheckoutButton } from "@/components/subscribe/subscribe-checkout-button";
import { buttonVariants } from "@/components/ui/button-variants";
import { getSubscribePlanDetails } from "@/lib/billing/plan";
import { cn } from "@/lib/utils";

const planIncludes = [
  "Full customer → project → estimate → proposal workflow",
  "AI estimate review and assistant",
  "Customer portal with accept, decline, and e-signature",
  "Analytics dashboard and team management",
];

export function Pricing() {
  const plan = getSubscribePlanDetails();

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-primary">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One plan. Everything included.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Subscribe to start using VoltPilot. Your team members are included under
            your organization subscription.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-xl rounded-xl border border-primary/20 bg-card p-8 shadow-sm ring-1 ring-primary/10">
          <h3 className="text-xl font-semibold">{plan.planName}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{plan.planDescription}</p>
          <p className="mt-6 text-4xl font-bold tracking-tight">
            ${plan.priceMonthly}
            <span className="text-base font-normal text-muted-foreground">/month</span>
          </p>

          <ul className="mt-6 space-y-3">
            {planIncludes.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>

          {plan.isConfigured ? (
            <SubscribeCheckoutButton className="mt-8 w-full gap-2" label="Subscribe" />
          ) : (
            <Link
              href="/subscribe"
              className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full gap-2")}
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Payment is required before your account is created.
          </p>
        </div>
      </div>
    </section>
  );
}
