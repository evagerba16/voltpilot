-- Stripe billing: organization subscriptions and checkout tracking.

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'inactive' check (
    status in (
      'active',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused',
      'inactive'
    )
  ),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_subscriptions_status_idx
  on public.organization_subscriptions (status);

create index if not exists organization_subscriptions_stripe_subscription_id_idx
  on public.organization_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null unique,
  email text not null,
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'expired', 'failed')
  ),
  user_id uuid references auth.users (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_checkout_sessions_email_idx
  on public.stripe_checkout_sessions (email);

alter table public.organization_subscriptions enable row level security;
alter table public.stripe_checkout_sessions enable row level security;

create policy "Org members can view their subscription"
  on public.organization_subscriptions
  for select
  to authenticated
  using (
    organization_id in (
      select tm.organization_id
      from public.team_members tm
      where tm.user_id = auth.uid()
        and tm.status = 'active'
    )
  );

create policy "Owners can view checkout sessions for their org email"
  on public.stripe_checkout_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

-- Backfill existing organizations so current beta users retain access until they migrate billing.
insert into public.organization_subscriptions (
  organization_id,
  stripe_customer_id,
  status
)
select
  o.id,
  'legacy_' || o.id::text,
  'active'
from public.organizations o
where not exists (
  select 1
  from public.organization_subscriptions s
  where s.organization_id = o.id
);
