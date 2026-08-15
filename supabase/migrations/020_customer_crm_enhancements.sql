-- Customer CRM enhancements: status, pinned notes, document categories

alter table public.customers
  add column if not exists status text not null default 'lead'
  check (status in ('lead', 'prospect', 'active', 'completed', 'archived'));

create index if not exists customers_status_idx
  on public.customers (organization_id, status);

alter table public.customer_notes
  add column if not exists is_pinned boolean not null default false;

create index if not exists customer_notes_pinned_idx
  on public.customer_notes (customer_id, is_pinned desc, created_at desc);

alter table public.customer_documents
  add column if not exists category text not null default 'other'
  check (
    category in (
      'contract',
      'photo',
      'permit',
      'warranty',
      'blueprint',
      'inspection',
      'other'
    )
  );

insert into public.schema_migrations (filename)
values ('020_customer_crm_enhancements.sql')
on conflict (filename) do nothing;
