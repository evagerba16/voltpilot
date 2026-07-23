import Link from "next/link";
import { Zap } from "lucide-react";

import { AlertBanner } from "@/components/ui/alert-banner";
import { buttonVariants } from "@/components/ui/button-variants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StripeCheckoutSessionRecord } from "@/lib/billing/types";
import { getStripeClient } from "@/lib/stripe/client";
import { cn } from "@/lib/utils";

type SubscribeSuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

async function getCompletedCheckoutRecord(stripeCheckoutSessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stripe_checkout_sessions")
    .select("*")
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as StripeCheckoutSessionRecord | null) ?? null;
}

export default async function SubscribeSuccessPage({
  searchParams,
}: SubscribeSuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id?.trim();
  const stripe = getStripeClient();

  let title = "Payment received";
  let message =
    "We are setting up your account. Check your email for a link to set your password, then sign in.";
  let isReady = false;

  if (sessionId && stripe) {
    const checkout = await stripe.checkout.sessions.retrieve(sessionId);
    const record = await getCompletedCheckoutRecord(sessionId);

    if (checkout.payment_status === "paid" && record?.status === "completed") {
      isReady = true;
      title = "Subscription active";
      message =
        "Your account and organization are ready. Check your email for a password setup link, then sign in to VoltPilot.";
    } else if (checkout.payment_status === "paid") {
      message =
        "Payment succeeded. Your account is being provisioned — refresh this page in a moment or check your email.";
    } else {
      title = "Payment pending";
      message = "Your payment has not completed yet. Return to checkout if you need to try again.";
    }
  }

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

      <div className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        <AlertBanner variant="info" title="Next step">
          {isReady
            ? "Use the password setup link from your email, then sign in."
            : "If setup takes more than a minute, contact support with your checkout confirmation."}
        </AlertBanner>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={cn(buttonVariants(), "flex-1 text-center")}>
            Sign in
          </Link>
          <Link
            href="/subscribe"
            className={cn(buttonVariants({ variant: "outline" }), "flex-1 text-center")}
          >
            Back to subscribe
          </Link>
        </div>
      </div>
    </main>
  );
}
