-- Run this in the Supabase SQL Editor after 004_proposals.sql and 008_company_settings.sql.

alter table public.proposals
  add column if not exists proposal_number text,
  add column if not exists proposal_date date not null default current_date,
  add column if not exists scope_of_work text,
  add column if not exists materials_summary text,
  add column if not exists labor_summary text,
  add column if not exists equipment_summary text,
  add column if not exists show_line_item_breakdown boolean not null default true,
  add column if not exists exclusions text,
  add column if not exists terms_and_conditions text,
  add column if not exists warranty_information text,
  add column if not exists customer_signature_name text,
  add column if not exists customer_signature_title text,
  add column if not exists contractor_signature_name text,
  add column if not exists contractor_signature_title text,
  add column if not exists notes text,
  add column if not exists estimate_snapshot jsonb,
  add column if not exists company_snapshot jsonb,
  add column if not exists last_autosaved_at timestamptz;

create index if not exists proposals_proposal_number_idx
  on public.proposals (user_id, proposal_number);

create unique index if not exists proposals_user_proposal_number_idx
  on public.proposals (user_id, proposal_number)
  where proposal_number is not null;
