-- Organization-scoped catalog overrides (equipment library management).

create table if not exists public.organization_catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category text not null default 'equipment'
    check (category in ('equipment')),
  catalog_item_id text,
  name text not null,
  default_unit text,
  default_unit_cost numeric(12, 2),
  description text,
  keywords text[] not null default '{}',
  is_hidden boolean not null default false,
  is_custom boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organization_catalog_items_seed_override_idx
  on public.organization_catalog_items (organization_id, category, catalog_item_id)
  where catalog_item_id is not null;

create unique index if not exists organization_catalog_items_custom_name_idx
  on public.organization_catalog_items (organization_id, category, lower(name))
  where catalog_item_id is null;

create index if not exists organization_catalog_items_org_category_idx
  on public.organization_catalog_items (organization_id, category, is_hidden, sort_order);

alter table public.organization_catalog_items enable row level security;

create policy "Org members can view catalog items"
  on public.organization_catalog_items for select
  using (public.can_view_org_data(organization_id));

create policy "Org editors can manage catalog items"
  on public.organization_catalog_items for all
  using (public.can_edit_estimates(organization_id))
  with check (public.can_edit_estimates(organization_id));

insert into public.schema_migrations (filename)
values ('022_organization_catalog_items.sql')
on conflict (filename) do nothing;
