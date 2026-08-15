-- Job costing: change orders, daily job logs, and field photo uploads.

create table if not exists public.project_change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  value_change numeric(14, 2) not null default 0,
  cost_impact numeric(14, 2) not null default 0,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_change_orders_project_idx
  on public.project_change_orders (project_id, created_at desc);

create index if not exists project_change_orders_org_idx
  on public.project_change_orders (organization_id, status);

create table if not exists public.project_job_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  crew_members text not null default '',
  hours_worked numeric(8, 2) not null default 0,
  work_completed text not null default '',
  delays text,
  weather text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_job_logs_project_idx
  on public.project_job_logs (project_id, log_date desc);

create index if not exists project_job_logs_org_idx
  on public.project_job_logs (organization_id, log_date desc);

create table if not exists public.project_job_log_photos (
  id uuid primary key default gen_random_uuid(),
  job_log_id uuid not null references public.project_job_logs (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  url text not null,
  mime_type text,
  file_size integer,
  created_at timestamptz not null default now()
);

create index if not exists project_job_log_photos_log_idx
  on public.project_job_log_photos (job_log_id);

alter table public.project_change_orders enable row level security;
alter table public.project_job_logs enable row level security;
alter table public.project_job_log_photos enable row level security;

create policy "Org members can view project change orders"
  on public.project_change_orders for select
  using (public.can_view_org_data(organization_id));

create policy "Org editors can manage project change orders"
  on public.project_change_orders for all
  using (public.can_edit_projects(organization_id))
  with check (public.can_edit_projects(organization_id));

create policy "Org members can view project job logs"
  on public.project_job_logs for select
  using (public.can_view_org_data(organization_id));

create policy "Org editors can manage project job logs"
  on public.project_job_logs for all
  using (public.can_edit_projects(organization_id))
  with check (public.can_edit_projects(organization_id));

create policy "Org members can view job log photos"
  on public.project_job_log_photos for select
  using (public.can_view_org_data(organization_id));

create policy "Org editors can manage job log photos"
  on public.project_job_log_photos for all
  using (public.can_edit_projects(organization_id))
  with check (public.can_edit_projects(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-job-photos',
  'project-job-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "Org members can read project job photos"
  on storage.objects for select
  using (
    bucket_id = 'project-job-photos'
    and public.can_view_org_data((storage.foldername(name))[1]::uuid)
  );

create policy "Org editors can upload project job photos"
  on storage.objects for insert
  with check (
    bucket_id = 'project-job-photos'
    and public.can_edit_projects((storage.foldername(name))[1]::uuid)
  );

create policy "Org editors can delete project job photos"
  on storage.objects for delete
  using (
    bucket_id = 'project-job-photos'
    and public.can_edit_projects((storage.foldername(name))[1]::uuid)
  );

insert into public.schema_migrations (filename)
values ('021_project_job_costing.sql')
on conflict (filename) do nothing;
