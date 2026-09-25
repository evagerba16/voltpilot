-- B2B project assignments: restrict project visibility for non-admin roles when enabled.

alter table public.organization_entitlements
  add column if not exists project_visibility_mode text not null default 'open';

alter table public.organization_entitlements
  drop constraint if exists organization_entitlements_project_visibility_mode_check;

alter table public.organization_entitlements
  add constraint organization_entitlements_project_visibility_mode_check
  check (project_visibility_mode in ('open', 'assigned'));

update public.organization_entitlements
set project_visibility_mode = 'assigned'
where plan_type = 'b2b'
  and project_visibility_mode = 'open';

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users (id) on delete set null,
  unique (project_id, team_member_id)
);

create index if not exists project_assignments_project_idx
  on public.project_assignments (project_id);

create index if not exists project_assignments_team_member_idx
  on public.project_assignments (team_member_id);

create or replace function public.project_assignment_org_match()
returns trigger
language plpgsql
as $$
declare
  v_project_org uuid;
  v_member_org uuid;
begin
  select organization_id into v_project_org
  from public.projects
  where id = new.project_id;

  select organization_id into v_member_org
  from public.team_members
  where id = new.team_member_id;

  if v_project_org is null or v_member_org is null or v_project_org <> v_member_org then
    raise exception 'Project assignment must link members and projects in the same organization.';
  end if;

  return new;
end;
$$;

drop trigger if exists project_assignments_org_match on public.project_assignments;
create trigger project_assignments_org_match
  before insert or update on public.project_assignments
  for each row
  execute function public.project_assignment_org_match();

create or replace function public.organization_project_visibility_mode(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select oe.project_visibility_mode
      from public.organization_entitlements oe
      where oe.organization_id = p_organization_id
    ),
    'open'
  );
$$;

create or replace function public.org_enforces_project_assignments(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      (
        select oe.plan_type
        from public.organization_entitlements oe
        where oe.organization_id = p_organization_id
      ),
      'legacy'
    ) = 'b2b'
    and public.organization_project_visibility_mode(p_organization_id) = 'assigned';
$$;

create or replace function public.can_manage_project_assignments(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_team(p_organization_id)
    and public.org_enforces_project_assignments(p_organization_id);
$$;

create or replace function public.can_view_org_project(
  p_organization_id uuid,
  p_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_active_team_member(p_organization_id) then false
    when not public.org_enforces_project_assignments(p_organization_id) then true
    when coalesce(public.current_team_role(p_organization_id), '') in ('owner', 'admin') then true
    else exists (
      select 1
      from public.project_assignments pa
      inner join public.team_members tm on tm.id = pa.team_member_id
      where pa.project_id = p_project_id
        and tm.organization_id = p_organization_id
        and tm.user_id = auth.uid()
        and tm.status = 'active'
    )
  end;
$$;

-- Projects
drop policy if exists "Team can view org projects" on public.projects;

create policy "Team can view org projects"
  on public.projects for select
  using (
    public.can_view_org_data(organization_id)
    and public.can_view_org_project(organization_id, id)
  );

-- Estimates
drop policy if exists "Team can view org estimates" on public.estimates;

create policy "Team can view org estimates"
  on public.estimates for select
  using (
    public.can_view_org_data(organization_id)
    and public.can_view_org_project(organization_id, project_id)
  );

-- Estimate line items
drop policy if exists "Team can view org estimate line items" on public.estimate_line_items;

create policy "Team can view org estimate line items"
  on public.estimate_line_items for select
  using (
    exists (
      select 1
      from public.estimates e
      where e.id = estimate_id
        and public.can_view_org_data(e.organization_id)
        and public.can_view_org_project(e.organization_id, e.project_id)
    )
  );

-- Proposals
drop policy if exists "Team can view org proposals" on public.proposals;

create policy "Team can view org proposals"
  on public.proposals for select
  using (
    public.can_view_org_data(organization_id)
    and public.can_view_org_project(organization_id, project_id)
  );

-- Job costing
drop policy if exists "Org members can view project change orders" on public.project_change_orders;

create policy "Org members can view project change orders"
  on public.project_change_orders for select
  using (
    public.can_view_org_data(organization_id)
    and public.can_view_org_project(organization_id, project_id)
  );

drop policy if exists "Org members can view project job logs" on public.project_job_logs;

create policy "Org members can view project job logs"
  on public.project_job_logs for select
  using (
    public.can_view_org_data(organization_id)
    and public.can_view_org_project(organization_id, project_id)
  );

drop policy if exists "Org members can view job log photos" on public.project_job_log_photos;

create policy "Org members can view job log photos"
  on public.project_job_log_photos for select
  using (
    public.can_view_org_data(organization_id)
    and exists (
      select 1
      from public.project_job_logs jl
      where jl.id = job_log_id
        and public.can_view_org_project(organization_id, jl.project_id)
    )
  );

alter table public.project_assignments enable row level security;

drop policy if exists "Members can view project assignments" on public.project_assignments;

create policy "Members can view project assignments"
  on public.project_assignments for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.can_view_org_project(p.organization_id, p.id)
    )
  );

drop policy if exists "Managers can assign project members" on public.project_assignments;

create policy "Managers can assign project members"
  on public.project_assignments for insert
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.can_manage_project_assignments(p.organization_id)
    )
  );

drop policy if exists "Managers can unassign project members" on public.project_assignments;

create policy "Managers can unassign project members"
  on public.project_assignments for delete
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.can_manage_project_assignments(p.organization_id)
    )
  );

grant execute on function public.organization_project_visibility_mode(uuid) to authenticated, service_role;
grant execute on function public.org_enforces_project_assignments(uuid) to authenticated, service_role;
grant execute on function public.can_manage_project_assignments(uuid) to authenticated, service_role;
grant execute on function public.can_view_org_project(uuid, uuid) to authenticated, service_role;

insert into public.schema_migrations (filename)
values ('026_b2b_project_assignments.sql')
on conflict (filename) do nothing;
