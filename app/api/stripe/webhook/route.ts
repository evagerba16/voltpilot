import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  getCheckoutSessionByStripeId,
  updateSubscriptionByStripeId,
  upsertOrganizationSubscription,
} from "@/lib/billing/admin-queries";
import {
  provisionAccountFromCheckoutSession,
  subscriptionFromStripe,
} from "@/lib/billing/provision-account";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { captureException } from "@/lib/observability/capture-exception";
import { logger } from "@/lib/observability/logger";
import { getStripeClient } from "@/lib/stripe/client";
import { getStripeEnv } from "@/lib/stripe/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { webhookSecret } = getStripeEnv();
  const stripe = getStripeClient();

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription") {
          break;
        }

        const existing = await getCheckoutSessionByStripeId(session.id);

        if (existing?.status === "completed") {
          logger.info("stripe webhook duplicate checkout.session.completed skipped", {
            sessionId: session.id,
            email: existing.email,
          });
          break;
        }

        const provisioned = await provisionAccountFromCheckoutSession(session);

        if (provisioned.passwordSetupUrl) {
          const emailResult = await sendWelcomeEmail({
            to: provisioned.email,
            passwordSetupUrl: provisioned.passwordSetupUrl,
          });

          if (!emailResult.sent) {
            logger.warn("account provisioned but welcome email failed", {
              sessionId: session.id,
              email: provisioned.email,
              reason: emailResult.message,
            });
          }
        }

        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const mapped = subscriptionFromStripe(subscription);

        const updated = await updateSubscriptionByStripeId(mapped);

        if (!updated && mapped.stripeCustomerId) {
          const organizationId = subscription.metadata?.organization_id;

          if (organizationId) {
            await upsertOrganizationSubscription({
              organizationId,
              ...mapped,
            });
          }
        }

        break;
      }
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed.";
    captureException(error, { source: "stripe-webhook", eventType: event.type });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
