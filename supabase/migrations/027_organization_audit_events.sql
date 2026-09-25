-- B2B company audit log (append-only, owner/admin SELECT only).

create or replace function public.is_b2b_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select oe.plan_type
      from public.organization_entitlements oe
      where oe.organization_id = p_organization_id
    ),
    'legacy'
  ) = 'b2b';
$$;

create table if not exists public.organization_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  actor_display_name text not null,
  event_type text not null check (
    event_type in (
      'team_member_invited',
      'team_invitation_revoked',
      'team_member_deactivated',
      'team_member_reactivated',
      'team_member_role_changed',
      'project_assigned',
      'project_unassigned',
      'company_settings_updated'
    )
  ),
  summary text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organization_audit_events_org_created_idx
  on public.organization_audit_events (organization_id, created_at desc);

alter table public.organization_audit_events enable row level security;

create policy "Owners and admins can view org audit events"
  on public.organization_audit_events
  for select
  to authenticated
  using (public.can_manage_team(organization_id));

create policy "Managers can append B2B audit events"
  on public.organization_audit_events
  for insert
  to authenticated
  with check (
    public.can_manage_team(organization_id)
    and actor_user_id = auth.uid()
    and public.is_b2b_organization(organization_id)
  );

grant execute on function public.is_b2b_organization(uuid) to authenticated, service_role;

insert into public.schema_migrations (filename)
values ('027_organization_audit_events.sql')
on conflict (filename) do nothing;
