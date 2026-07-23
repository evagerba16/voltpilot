-- Run this in the Supabase SQL Editor after 003_estimates.sql.

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete restrict,
  estimate_id uuid references public.estimates (id) on delete set null,
  title text not null,
  status text not null default 'Draft' check (
    status in ('Draft', 'Sent', 'Won', 'Lost')
  ),
  amount numeric(14, 2) not null default 0,
  sent_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_user_id_idx on public.proposals (user_id);
create index if not exists proposals_project_id_idx on public.proposals (project_id);
create index if not exists proposals_status_idx on public.proposals (status);

alter table public.proposals enable row level security;

create policy "Users can view own proposals"
  on public.proposals
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own proposals"
  on public.proposals
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own proposals"
  on public.proposals
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own proposals"
  on public.proposals
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_proposals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists proposals_updated_at on public.proposals;

create trigger proposals_updated_at
  before update on public.proposals
  for each row
  execute function public.set_proposals_updated_at();
