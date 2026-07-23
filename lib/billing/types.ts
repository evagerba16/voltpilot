export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | "inactive";

export type OrganizationSubscription = {
  id: string;
  organization_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckoutSessionStatus = "pending" | "completed" | "expired" | "failed";

export type StripeCheckoutSessionRecord = {
  id: string;
  stripe_checkout_session_id: string;
  email: string;
  status: CheckoutSessionStatus;
  user_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
};
