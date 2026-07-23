-- Run this in the Supabase SQL Editor after 001_customers.sql.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  project_name text not null,
  project_address text,
  project_type text not null,
  status text not null default 'Draft' check (
    status in ('Draft', 'Active', 'Submitted', 'Awarded', 'Completed')
  ),
  estimated_value numeric(12, 2),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_customer_id_idx on public.projects (customer_id);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_archived_at_idx on public.projects (archived_at);

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on public.projects;

create trigger projects_updated_at
  before update on public.projects
  for each row
  execute function public.set_projects_updated_at();
