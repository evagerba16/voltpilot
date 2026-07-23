-- Analytics performance indexes and optional job-cost tracking.
-- Run after 012_proposals_workflow.sql.

-- Performance indexes for dashboard queries
create index if not exists estimates_org_updated_idx
  on public.estimates (organization_id, updated_at desc);

create index if not exists estimates_org_created_idx
  on public.estimates (organization_id, created_at desc);

create index if not exists estimates_org_status_idx
  on public.estimates (organization_id, status);

create index if not exists proposals_org_updated_idx
  on public.proposals (organization_id, updated_at desc);

create index if not exists proposals_org_status_idx
  on public.proposals (organization_id, status);

create index if not exists proposals_org_sent_at_idx
  on public.proposals (organization_id, sent_at desc)
  where sent_at is not null;

create index if not exists projects_org_status_idx
  on public.projects (organization_id, status);

create index if not exists projects_org_updated_idx
  on public.projects (organization_id, updated_at desc);

create index if not exists customers_org_created_idx
  on public.customers (organization_id, created_at desc);

create index if not exists estimate_versions_estimate_created_idx
  on public.estimate_versions (estimate_id, created_at asc);

-- Only when migration 011 (AI assistant) has been applied.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'estimate_ai_sessions'
  ) then
    execute '
      create index if not exists estimate_ai_sessions_org_created_idx
        on public.estimate_ai_sessions (organization_id, created_at desc)
    ';
  end if;
end $$;

-- Optional actual job costs for estimate-vs-actual analytics.
-- Populated manually or via future job-costing features.
create table if not exists public.project_job_actuals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actual_labor numeric(14, 2) not null default 0,
  actual_materials numeric(14, 2) not null default 0,
  actual_equipment numeric(14, 2) not null default 0,
  actual_subcontractors numeric(14, 2) not null default 0,
  actual_miscellaneous numeric(14, 2) not null default 0,
  actual_total numeric(14, 2) not null default 0,
  change_order_count integer not null default 0,
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_job_actuals_project_idx
  on public.project_job_actuals (project_id);

create index if not exists project_job_actuals_org_idx
  on public.project_job_actuals (organization_id, recorded_at desc);

alter table public.project_job_actuals enable row level security;

create policy "Org members can view project job actuals"
  on public.project_job_actuals
  for select
  using (public.can_view_org_data(organization_id));

create policy "Org editors can manage project job actuals"
  on public.project_job_actuals
  for all
  using (public.can_edit_projects(organization_id))
  with check (public.can_edit_projects(organization_id));

-- Analytics summary RPC for fast executive KPIs (optional optimization path).
create or replace function public.get_analytics_executive_summary(
  p_organization_id uuid,
  p_range_start timestamptz default null,
  p_customer_id uuid default null,
  p_project_id uuid default null,
  p_project_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.can_view_org_data(p_organization_id) then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'revenue',
      coalesce((
        select sum(p.amount)
        from public.proposals p
        inner join public.projects pr on pr.id = p.project_id
        where p.organization_id = p_organization_id
          and p.status in ('Accepted', 'Won')
          and (p_range_start is null or coalesce(p.decided_at, p.updated_at) >= p_range_start)
          and (p_customer_id is null or pr.customer_id = p_customer_id)
          and (p_project_id is null or pr.id = p_project_id)
          and (p_project_status is null or pr.status = p_project_status)
      ), 0),
    'total_estimates',
      coalesce((
        select count(*)
        from public.estimates e
        inner join public.projects pr on pr.id = e.project_id
        where e.organization_id = p_organization_id
          and (p_range_start is null or e.updated_at >= p_range_start)
          and (p_customer_id is null or pr.customer_id = p_customer_id)
          and (p_project_id is null or pr.id = p_project_id)
          and (p_project_status is null or pr.status = p_project_status)
      ), 0),
    'total_proposals',
      coalesce((
        select count(*)
        from public.proposals p
        inner join public.projects pr on pr.id = p.project_id
        where p.organization_id = p_organization_id
          and (p_range_start is null or p.updated_at >= p_range_start)
          and (p_customer_id is null or pr.customer_id = p_customer_id)
          and (p_project_id is null or pr.id = p_project_id)
          and (p_project_status is null or pr.status = p_project_status)
      ), 0),
    'active_projects',
      coalesce((
        select count(*)
        from public.projects pr
        where pr.organization_id = p_organization_id
          and pr.archived_at is null
          and pr.status not in ('Archived', 'Lost')
          and (p_range_start is null or pr.updated_at >= p_range_start)
          and (p_customer_id is null or pr.customer_id = p_customer_id)
          and (p_project_id is null or pr.id = p_project_id)
          and (p_project_status is null or pr.status = p_project_status)
      ), 0)
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_analytics_executive_summary(uuid, timestamptz, uuid, uuid, text)
  to authenticated;
