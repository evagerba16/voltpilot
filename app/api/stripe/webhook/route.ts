import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  updateSubscriptionByStripeId,
  upsertOrganizationSubscription,
} from "@/lib/billing/admin-queries";
import {
  provisionAccountFromCheckoutSession,
  subscriptionFromStripe,
} from "@/lib/billing/provision-account";
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

        if (session.mode === "subscription") {
          await provisionAccountFromCheckoutSession(session);
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
    console.error("[stripe webhook]", event.type, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
