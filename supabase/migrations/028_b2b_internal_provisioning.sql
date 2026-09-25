-- Internal B2B provisioning: quote audit fields + service-role org bootstrap.

alter table public.company_quote_requests
  add column if not exists organization_id uuid references public.organizations (id) on delete set null,
  add column if not exists owner_email text,
  add column if not exists provisioned_at timestamptz,
  add column if not exists provisioned_by text;

create index if not exists company_quote_requests_organization_id_idx
  on public.company_quote_requests (organization_id)
  where organization_id is not null;

alter table public.organization_entitlements
  add column if not exists project_visibility_mode text not null default 'open';

alter table public.organization_entitlements
  drop constraint if exists organization_entitlements_project_visibility_mode_check;

alter table public.organization_entitlements
  add constraint organization_entitlements_project_visibility_mode_check
  check (project_visibility_mode in ('open', 'assigned'));

-- Creates a new organization for a B2B owner (service role only). Does not reuse an existing membership org.
create or replace function public.bootstrap_b2b_owner_organization(
  p_user_id uuid,
  p_email text,
  p_company_name text default 'Your Company'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_slug text;
  v_name text;
begin
  if p_user_id is null then
    raise exception 'Owner user id is required.';
  end if;

  if coalesce(trim(p_email), '') = '' then
    raise exception 'Owner email is required.';
  end if;

  v_name := coalesce(nullif(trim(p_company_name), ''), 'Your Company');
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(p_user_id::text, 1, 8);

  insert into public.organizations (name, slug, owner_id)
  values (v_name, v_slug, p_user_id)
  returning id into v_org_id;

  insert into public.team_members (
    organization_id,
    user_id,
    email,
    display_name,
    role,
    status,
    joined_at
  )
  values (
    v_org_id,
    p_user_id,
    lower(trim(p_email)),
    split_part(p_email, '@', 1),
    'owner',
    'active',
    now()
  );

  insert into public.company_settings (user_id, organization_id, company_name)
  values (p_user_id, v_org_id, v_name)
  on conflict (user_id) do update
    set organization_id = excluded.organization_id,
        company_name = excluded.company_name
  where public.company_settings.organization_id is null;

  update public.customers
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  update public.projects
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  update public.estimates
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  update public.estimate_versions
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  update public.proposals
  set organization_id = v_org_id
  where user_id = p_user_id
    and organization_id is null;

  return v_org_id;
end;
$$;

revoke all on function public.bootstrap_b2b_owner_organization(uuid, text, text) from public;
grant execute on function public.bootstrap_b2b_owner_organization(uuid, text, text) to service_role;

create unique index if not exists organization_entitlements_company_quote_request_id_key
  on public.organization_entitlements (company_quote_request_id)
  where company_quote_request_id is not null;
