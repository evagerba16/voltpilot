-- Run this in the Supabase SQL Editor after 003_estimates.sql.

alter table public.estimates
  add column if not exists contingency_percent numeric(8, 4) not null default 0,
  add column if not exists gross_margin_percent numeric(8, 4) not null default 0,
  add column if not exists labor_total numeric(14, 2) not null default 0,
  add column if not exists materials_total numeric(14, 2) not null default 0,
  add column if not exists equipment_total numeric(14, 2) not null default 0,
  add column if not exists subcontractors_total numeric(14, 2) not null default 0,
  add column if not exists miscellaneous_total numeric(14, 2) not null default 0,
  add column if not exists contingency_amount numeric(14, 2) not null default 0,
  add column if not exists selling_price numeric(14, 2) not null default 0,
  add column if not exists last_autosaved_at timestamptz;

update public.estimates
set
  contingency_percent = markup_percent,
  contingency_amount = markup_amount,
  selling_price = grand_total
where contingency_percent = 0 and markup_percent > 0;

alter table public.estimate_line_items
  drop constraint if exists estimate_line_items_category_check;

alter table public.estimate_line_items
  add constraint estimate_line_items_category_check check (
    category in (
      'labor',
      'materials',
      'equipment',
      'subcontractors',
      'miscellaneous'
    )
  );

create table if not exists public.estimate_versions (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version_number integer not null,
  label text not null default 'Manual save',
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists estimate_versions_estimate_id_idx
  on public.estimate_versions (estimate_id);

create unique index if not exists estimate_versions_estimate_version_idx
  on public.estimate_versions (estimate_id, version_number);

alter table public.estimate_versions enable row level security;

create policy "Users can view own estimate versions"
  on public.estimate_versions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own estimate versions"
  on public.estimate_versions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own estimate versions"
  on public.estimate_versions
  for delete
  using (auth.uid() = user_id);
