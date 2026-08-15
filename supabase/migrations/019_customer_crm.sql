-- Customer CRM: timestamped notes, documents, and storage bucket

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_notes_customer_idx
  on public.customer_notes (customer_id, created_at desc);

alter table public.customer_notes enable row level security;

create policy "customer_notes_select_org"
  on public.customer_notes for select
  using (public.can_view_org_data(organization_id));

create policy "customer_notes_insert_org"
  on public.customer_notes for insert
  with check (
    public.can_edit_customers(organization_id)
    and auth.uid() = user_id
  );

create policy "customer_notes_update_org"
  on public.customer_notes for update
  using (public.can_edit_customers(organization_id));

create policy "customer_notes_delete_org"
  on public.customer_notes for delete
  using (public.can_edit_customers(organization_id));

create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  url text not null,
  storage_path text,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists customer_documents_customer_idx
  on public.customer_documents (customer_id, created_at desc);

alter table public.customer_documents enable row level security;

create policy "customer_documents_select_org"
  on public.customer_documents for select
  using (public.can_view_org_data(organization_id));

create policy "customer_documents_insert_org"
  on public.customer_documents for insert
  with check (
    public.can_edit_customers(organization_id)
    and auth.uid() = user_id
  );

create policy "customer_documents_delete_org"
  on public.customer_documents for delete
  using (public.can_edit_customers(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-documents',
  'customer-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do nothing;

create policy "customer_documents_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'customer-documents'
    and public.can_view_org_data((storage.foldername(name))[1]::uuid)
  );

create policy "customer_documents_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'customer-documents'
    and public.can_edit_customers((storage.foldername(name))[1]::uuid)
  );

create policy "customer_documents_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'customer-documents'
    and public.can_edit_customers((storage.foldername(name))[1]::uuid)
  );

insert into public.schema_migrations (filename)
values ('019_customer_crm.sql')
on conflict (filename) do nothing;
