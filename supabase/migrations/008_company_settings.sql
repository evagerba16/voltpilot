-- Run this in the Supabase SQL Editor after 001_customers.sql.

create table if not exists public.company_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_name text not null default 'Your Company',
  company_logo_url text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  website text,
  license_number text,
  default_terms text,
  default_warranty text,
  default_exclusions text,
  contractor_signature_name text,
  contractor_signature_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;

create policy "Users can view own company settings"
  on public.company_settings
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own company settings"
  on public.company_settings
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own company settings"
  on public.company_settings
  for update
  using (auth.uid() = user_id);

create or replace function public.set_company_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_settings_updated_at on public.company_settings;

create trigger company_settings_updated_at
  before update on public.company_settings
  for each row
  execute function public.set_company_settings_updated_at();
