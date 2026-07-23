-- =============================================================================
-- VoltPilot: Team Management migration (010)
-- =============================================================================
-- Run this entire script in Supabase Dashboard → SQL Editor → New query → Run.
--
-- Prerequisites: migrations 001–009 must already be applied (customers, projects,
-- estimates, proposals, company_settings tables must exist).
--
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =============================================================================

-- Prerequisite check
do $$
begin
  if to_regclass('public.customers') is null then
    raise exception 'Missing table public.customers. Apply migrations 001–009 first.';
  end if;
  if to_regclass('public.company_settings') is null then
    raise exception 'Missing table public.company_settings. Apply migration 008 first.';
  end if;
end $$;

-- Team management: organizations, members, invitations, and org-scoped data access.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_owner_id_idx on public.organizations (owner_id);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  display_name text,
  role text not null check (
    role in ('owner', 'admin', 'estimator', 'project_manager', 'viewer')
  ),
  status text not null default 'active' check (status in ('active', 'deactivated')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz,
  deactivated_at timestamptz,
  deactivated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create unique index if not exists team_members_org_user_idx
  on public.team_members (organization_id, user_id)
  where user_id is not null;

create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists team_members_org_status_idx
  on public.team_members (organization_id, status);

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (
    role in ('admin', 'estimator', 'project_manager', 'viewer')
  ),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists team_invitations_token_idx on public.team_invitations (token);
create index if not exists team_invitations_email_idx on public.team_invitations (email);

-- Organization scoping on business tables
alter table public.customers
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

alter table public.projects
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

alter table public.estimates
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

alter table public.estimate_versions
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

alter table public.proposals
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

alter table public.company_settings
  add column if not exists organization_id uuid unique references public.organizations (id) on delete cascade;

create index if not exists customers_organization_id_idx on public.customers (organization_id);
create index if not exists projects_organization_id_idx on public.projects (organization_id);
create index if not exists estimates_organization_id_idx on public.estimates (organization_id);
create index if not exists estimate_versions_organization_id_idx on public.estimate_versions (organization_id);
create index if not exists proposals_organization_id_idx on public.proposals (organization_id);

-- Helper functions for RLS
create or replace function public.is_active_team_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.current_team_role(org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.team_members
  where organization_id = org_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.can_view_org_data(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_team_member(org_id);
$$;

create or replace function public.can_edit_customers(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(org_id), '') in (
    'owner', 'admin', 'project_manager'
  );
$$;

create or replace function public.can_edit_projects(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(org_id), '') in (
    'owner', 'admin', 'estimator', 'project_manager'
  );
$$;

create or replace function public.can_edit_estimates(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(org_id), '') in (
    'owner', 'admin', 'estimator', 'project_manager'
  );
$$;

create or replace function public.can_edit_proposals(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(org_id), '') in (
    'owner', 'admin', 'project_manager'
  );
$$;

create or replace function public.can_manage_company_settings(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(org_id), '') in ('owner', 'admin');
$$;

create or replace function public.can_manage_team(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(org_id), '') in ('owner', 'admin');
$$;

-- Bootstrap org for existing users and backfill organization_id
create or replace function public.ensure_user_organization(
  p_user_id uuid,
  p_email text,
  p_company_name text default 'Your Company'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_slug text;
  v_name text;
begin
  select organization_id
  into v_org_id
  from public.team_members
  where user_id = p_user_id
    and status = 'active'
  order by created_at asc
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  v_name := coalesce(nullif(trim(p_company_name), ''), 'Your Company');
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(p_user_id::text, 1, 8);

  insert into public.organizations (name, slug, owner_id)
  values (v_name, v_slug, p_user_id)
  returning id into v_org_id;

  insert into public.team_members (
    organization_id,
    user_id,
    email,
    display_name,
    role,
    status,
    joined_at
  )
  values (
    v_org_id,
    p_user_id,
    lower(trim(p_email)),
    split_part(p_email, '@', 1),
    'owner',
    'active',
    now()
  );

  insert into public.company_settings (user_id, organization_id, company_name)
  values (p_user_id, v_org_id, v_name)
  on conflict (user_id) do update
    set organization_id = excluded.organization_id
  where public.company_settings.organization_id is null;

  update public.customers
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  update public.projects
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  update public.estimates
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  update public.estimate_versions
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  update public.proposals
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  return v_org_id;
end;
$$;

-- Updated-at triggers for new tables
create or replace function public.set_organizations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
  before update on public.organizations
  for each row
  execute function public.set_organizations_updated_at();

create or replace function public.set_team_members_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists team_members_updated_at on public.team_members;
create trigger team_members_updated_at
  before update on public.team_members
  for each row
  execute function public.set_team_members_updated_at();

-- RLS: organizations
alter table public.organizations enable row level security;

drop policy if exists "Team members can view their organization" on public.organizations;
create policy "Team members can view their organization"
  on public.organizations
  for select
  using (public.is_active_team_member(id));

drop policy if exists "Owners can update their organization" on public.organizations;
create policy "Owners can update their organization"
  on public.organizations
  for update
  using (public.current_team_role(id) = 'owner');

-- RLS: team_members
alter table public.team_members enable row level security;

drop policy if exists "Team members can view org members" on public.team_members;
create policy "Team members can view org members"
  on public.team_members
  for select
  using (public.is_active_team_member(organization_id));

drop policy if exists "Managers can insert team members" on public.team_members;
create policy "Managers can insert team members"
  on public.team_members
  for insert
  with check (public.can_manage_team(organization_id));

drop policy if exists "Managers can update team members" on public.team_members;
create policy "Managers can update team members"
  on public.team_members
  for update
  using (public.can_manage_team(organization_id));

-- RLS: team_invitations
alter table public.team_invitations enable row level security;

drop policy if exists "Managers can view invitations" on public.team_invitations;
create policy "Managers can view invitations"
  on public.team_invitations
  for select
  using (public.can_manage_team(organization_id));

drop policy if exists "Managers can create invitations" on public.team_invitations;
create policy "Managers can create invitations"
  on public.team_invitations
  for insert
  with check (public.can_manage_team(organization_id));

drop policy if exists "Managers can update invitations" on public.team_invitations;
create policy "Managers can update invitations"
  on public.team_invitations
  for update
  using (public.can_manage_team(organization_id));

drop policy if exists "Managers can delete invitations" on public.team_invitations;
create policy "Managers can delete invitations"
  on public.team_invitations
  for delete
  using (public.can_manage_team(organization_id));

-- Replace business table RLS policies
drop policy if exists "Users can view own customers" on public.customers;
drop policy if exists "Users can insert own customers" on public.customers;
drop policy if exists "Users can update own customers" on public.customers;
drop policy if exists "Users can delete own customers" on public.customers;
drop policy if exists "Team can view org customers" on public.customers;
drop policy if exists "Editors can insert org customers" on public.customers;
drop policy if exists "Editors can update org customers" on public.customers;
drop policy if exists "Editors can delete org customers" on public.customers;

create policy "Team can view org customers"
  on public.customers for select
  using (public.can_view_org_data(organization_id));

create policy "Editors can insert org customers"
  on public.customers for insert
  with check (
    public.can_edit_customers(organization_id)
    and auth.uid() = user_id
  );

create policy "Editors can update org customers"
  on public.customers for update
  using (public.can_edit_customers(organization_id));

create policy "Editors can delete org customers"
  on public.customers for delete
  using (public.can_edit_customers(organization_id));

drop policy if exists "Users can view own projects" on public.projects;
drop policy if exists "Users can insert own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;
drop policy if exists "Team can view org projects" on public.projects;
drop policy if exists "Editors can insert org projects" on public.projects;
drop policy if exists "Editors can update org projects" on public.projects;
drop policy if exists "Editors can delete org projects" on public.projects;

create policy "Team can view org projects"
  on public.projects for select
  using (public.can_view_org_data(organization_id));

create policy "Editors can insert org projects"
  on public.projects for insert
  with check (
    public.can_edit_projects(organization_id)
    and auth.uid() = user_id
  );

create policy "Editors can update org projects"
  on public.projects for update
  using (public.can_edit_projects(organization_id));

create policy "Editors can delete org projects"
  on public.projects for delete
  using (public.can_edit_projects(organization_id));

drop policy if exists "Users can view own estimates" on public.estimates;
drop policy if exists "Users can insert own estimates" on public.estimates;
drop policy if exists "Users can update own estimates" on public.estimates;
drop policy if exists "Users can delete own estimates" on public.estimates;
drop policy if exists "Team can view org estimates" on public.estimates;
drop policy if exists "Editors can insert org estimates" on public.estimates;
drop policy if exists "Editors can update org estimates" on public.estimates;
drop policy if exists "Editors can delete org estimates" on public.estimates;

create policy "Team can view org estimates"
  on public.estimates for select
  using (public.can_view_org_data(organization_id));

create policy "Editors can insert org estimates"
  on public.estimates for insert
  with check (
    public.can_edit_estimates(organization_id)
    and auth.uid() = user_id
  );

create policy "Editors can update org estimates"
  on public.estimates for update
  using (public.can_edit_estimates(organization_id));

create policy "Editors can delete org estimates"
  on public.estimates for delete
  using (public.can_edit_estimates(organization_id));

drop policy if exists "Users can view own estimate line items" on public.estimate_line_items;
drop policy if exists "Users can insert own estimate line items" on public.estimate_line_items;
drop policy if exists "Users can update own estimate line items" on public.estimate_line_items;
drop policy if exists "Users can delete own estimate line items" on public.estimate_line_items;
drop policy if exists "Team can view org estimate line items" on public.estimate_line_items;
drop policy if exists "Editors can insert org estimate line items" on public.estimate_line_items;
drop policy if exists "Editors can update org estimate line items" on public.estimate_line_items;
drop policy if exists "Editors can delete org estimate line items" on public.estimate_line_items;

create policy "Team can view org estimate line items"
  on public.estimate_line_items for select
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and public.can_view_org_data(e.organization_id)
    )
  );

create policy "Editors can insert org estimate line items"
  on public.estimate_line_items for insert
  with check (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and public.can_edit_estimates(e.organization_id)
    )
  );

create policy "Editors can update org estimate line items"
  on public.estimate_line_items for update
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and public.can_edit_estimates(e.organization_id)
    )
  );

create policy "Editors can delete org estimate line items"
  on public.estimate_line_items for delete
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and public.can_edit_estimates(e.organization_id)
    )
  );

drop policy if exists "Users can view own estimate versions" on public.estimate_versions;
drop policy if exists "Users can insert own estimate versions" on public.estimate_versions;
drop policy if exists "Users can delete own estimate versions" on public.estimate_versions;
drop policy if exists "Team can view org estimate versions" on public.estimate_versions;
drop policy if exists "Editors can insert org estimate versions" on public.estimate_versions;
drop policy if exists "Editors can delete org estimate versions" on public.estimate_versions;

create policy "Team can view org estimate versions"
  on public.estimate_versions for select
  using (public.can_view_org_data(organization_id));

create policy "Editors can insert org estimate versions"
  on public.estimate_versions for insert
  with check (
    public.can_edit_estimates(organization_id)
    and auth.uid() = user_id
  );

create policy "Editors can delete org estimate versions"
  on public.estimate_versions for delete
  using (public.can_edit_estimates(organization_id));

drop policy if exists "Users can view own proposals" on public.proposals;
drop policy if exists "Users can insert own proposals" on public.proposals;
drop policy if exists "Users can update own proposals" on public.proposals;
drop policy if exists "Users can delete own proposals" on public.proposals;
drop policy if exists "Team can view org proposals" on public.proposals;
drop policy if exists "Editors can insert org proposals" on public.proposals;
drop policy if exists "Editors can update org proposals" on public.proposals;
drop policy if exists "Editors can delete org proposals" on public.proposals;

create policy "Team can view org proposals"
  on public.proposals for select
  using (public.can_view_org_data(organization_id));

create policy "Editors can insert org proposals"
  on public.proposals for insert
  with check (
    public.can_edit_proposals(organization_id)
    and auth.uid() = user_id
  );

create policy "Editors can update org proposals"
  on public.proposals for update
  using (public.can_edit_proposals(organization_id));

create policy "Editors can delete org proposals"
  on public.proposals for delete
  using (public.can_edit_proposals(organization_id));

drop policy if exists "Users can view own company settings" on public.company_settings;
drop policy if exists "Users can insert own company settings" on public.company_settings;
drop policy if exists "Users can update own company settings" on public.company_settings;
drop policy if exists "Team can view org company settings" on public.company_settings;
drop policy if exists "Managers can insert org company settings" on public.company_settings;
drop policy if exists "Managers can update org company settings" on public.company_settings;

create policy "Team can view org company settings"
  on public.company_settings for select
  using (public.can_view_org_data(organization_id));

create policy "Managers can insert org company settings"
  on public.company_settings for insert
  with check (public.can_manage_company_settings(organization_id));

create policy "Managers can update org company settings"
  on public.company_settings for update
  using (public.can_manage_company_settings(organization_id));

-- Allow authenticated users to bootstrap their organization via RPC
grant execute on function public.ensure_user_organization(uuid, text, text) to authenticated;
grant execute on function public.ensure_user_organization(uuid, text, text) to service_role;

grant execute on function public.is_active_team_member(uuid) to authenticated, service_role;
grant execute on function public.current_team_role(uuid) to authenticated, service_role;
grant execute on function public.can_view_org_data(uuid) to authenticated, service_role;
grant execute on function public.can_edit_customers(uuid) to authenticated, service_role;
grant execute on function public.can_edit_projects(uuid) to authenticated, service_role;
grant execute on function public.can_edit_estimates(uuid) to authenticated, service_role;
grant execute on function public.can_edit_proposals(uuid) to authenticated, service_role;
grant execute on function public.can_manage_company_settings(uuid) to authenticated, service_role;
grant execute on function public.can_manage_team(uuid) to authenticated, service_role;

-- =============================================================================
-- Verification (run automatically with the script)
-- =============================================================================
select
  proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname = 'ensure_user_organization';

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('organizations', 'team_members', 'team_invitations')
order by table_name;
