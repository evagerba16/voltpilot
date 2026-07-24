-- VoltPilot Copilot: persisted recommendations with org-scoped RLS.

create table if not exists public.copilot_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  module text not null check (module in ('estimate', 'project', 'customer', 'proposal', 'analytics')),
  entity_type text not null,
  entity_id uuid not null,
  recommendation_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  explanation text not null,
  payload jsonb not null default '{}'::jsonb,
  reasoning jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'applied', 'dismissed')),
  applied_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists copilot_recommendations_org_entity_idx
  on public.copilot_recommendations (organization_id, entity_type, entity_id, status, created_at desc);

create index if not exists copilot_recommendations_pending_idx
  on public.copilot_recommendations (organization_id, status, created_at desc)
  where status = 'pending';

alter table public.copilot_recommendations enable row level security;

create policy "Org members can view copilot recommendations"
  on public.copilot_recommendations for select
  using (public.can_view_org_data(organization_id));

create policy "Org editors can manage copilot recommendations"
  on public.copilot_recommendations for all
  using (public.can_edit_estimates(organization_id))
  with check (public.can_edit_estimates(organization_id));

insert into public.schema_migrations (filename)
values ('023_copilot_recommendations.sql')
on conflict (filename) do nothing;
