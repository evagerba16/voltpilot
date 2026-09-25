import Link from "next/link";
import { ArrowRight, Building2, Check } from "lucide-react";

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

const companyIncludes = [
  "Dedicated company workspace with owner and admin roles",
  "Invite contractors by email — each gets their own login",
  "Seat limits managed for your team size",
  "Tailored onboarding and company proposal",
];

export function Pricing() {
  const plan = getSubscribePlanDetails();

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-primary">
            Choose your path
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Find the right fit for your business.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Subscribe individually, or request a company quote if you&apos;re
            bringing a team.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-primary/20 bg-card p-8 shadow-sm ring-1 ring-primary/10">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Individual
            </p>
            <h3 className="mt-2 text-xl font-semibold">Individual Contractor</h3>
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
                Subscribe
                <ArrowRight className="size-4" />
              </Link>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Payment is required before your account is created.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              For Contracting Companies
            </p>
            <h3 className="mt-2 text-xl font-semibold">Business Account</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              For electrical contractors with multiple estimators, project managers,
              and field teams who need shared access under one company.
            </p>
            <p className="mt-6 text-4xl font-bold tracking-tight">
              Custom
              <span className="text-base font-normal text-muted-foreground"> pricing</span>
            </p>

            <ul className="mt-6 space-y-3">
              {companyIncludes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/company-quote"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "mt-8 w-full gap-2"
              )}
            >
              <Building2 className="size-4" />
              Get a Company Quote
            </Link>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              We&apos;ll follow up with a tailored proposal — no automatic pricing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
