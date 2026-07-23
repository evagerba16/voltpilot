-- Run this in the Supabase SQL Editor after 002_projects.sql.

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete restrict,
  title text not null,
  status text not null default 'Draft' check (status in ('Draft', 'Final')),
  overhead_percent numeric(8, 4) not null default 0,
  markup_percent numeric(8, 4) not null default 0,
  tax_percent numeric(8, 4) not null default 0,
  profit_margin_percent numeric(8, 4) not null default 0,
  notes text,
  direct_cost_total numeric(14, 2) not null default 0,
  overhead_amount numeric(14, 2) not null default 0,
  markup_amount numeric(14, 2) not null default 0,
  profit_amount numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  grand_total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  category text not null check (
    category in ('labor', 'materials', 'equipment', 'subcontractors')
  ),
  description text not null default '',
  quantity numeric(12, 4) not null default 0,
  unit text not null default 'ea',
  unit_cost numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists estimates_user_id_idx on public.estimates (user_id);
create index if not exists estimates_project_id_idx on public.estimates (project_id);
create index if not exists estimate_line_items_estimate_id_idx
  on public.estimate_line_items (estimate_id);

alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;

create policy "Users can view own estimates"
  on public.estimates
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own estimates"
  on public.estimates
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own estimates"
  on public.estimates
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own estimates"
  on public.estimates
  for delete
  using (auth.uid() = user_id);

create policy "Users can view own estimate line items"
  on public.estimate_line_items
  for select
  using (
    exists (
      select 1
      from public.estimates
      where estimates.id = estimate_line_items.estimate_id
        and estimates.user_id = auth.uid()
    )
  );

create policy "Users can insert own estimate line items"
  on public.estimate_line_items
  for insert
  with check (
    exists (
      select 1
      from public.estimates
      where estimates.id = estimate_line_items.estimate_id
        and estimates.user_id = auth.uid()
    )
  );

create policy "Users can update own estimate line items"
  on public.estimate_line_items
  for update
  using (
    exists (
      select 1
      from public.estimates
      where estimates.id = estimate_line_items.estimate_id
        and estimates.user_id = auth.uid()
    )
  );

create policy "Users can delete own estimate line items"
  on public.estimate_line_items
  for delete
  using (
    exists (
      select 1
      from public.estimates
      where estimates.id = estimate_line_items.estimate_id
        and estimates.user_id = auth.uid()
    )
  );

create or replace function public.set_estimates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists estimates_updated_at on public.estimates;

create trigger estimates_updated_at
  before update on public.estimates
  for each row
  execute function public.set_estimates_updated_at();
