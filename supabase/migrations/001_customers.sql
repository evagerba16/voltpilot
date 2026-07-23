-- Run this in the Supabase SQL Editor for your project.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone_number text,
  project_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_user_id_idx on public.customers (user_id);
create index if not exists customers_company_name_idx on public.customers (company_name);

alter table public.customers enable row level security;

create policy "Users can view own customers"
  on public.customers
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own customers"
  on public.customers
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own customers"
  on public.customers
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own customers"
  on public.customers
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_customers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_updated_at on public.customers;

create trigger customers_updated_at
  before update on public.customers
  for each row
  execute function public.set_customers_updated_at();
