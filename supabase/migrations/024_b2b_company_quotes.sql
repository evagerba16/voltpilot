-- B2B company quote requests and organization seat entitlements (no Stripe required).

create table if not exists public.company_quote_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  work_email text not null,
  phone text,
  contractor_count_range text not null check (
    contractor_count_range in ('1-5', '6-15', '16-30', '31-50', '51+')
  ),
  goals text not null,
  status text not null default 'pending' check (
    status in ('pending', 'reviewed', 'provisioned', 'declined')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_quote_requests_status_idx
  on public.company_quote_requests (status, created_at desc);

create index if not exists company_quote_requests_work_email_idx
  on public.company_quote_requests (lower(work_email));

create table if not exists public.organization_entitlements (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  seat_limit integer check (seat_limit is null or seat_limit > 0),
  plan_type text not null default 'legacy' check (
    plan_type in ('solo', 'b2b', 'legacy')
  ),
  billing_source text not null default 'legacy' check (
    billing_source in ('stripe', 'manual', 'legacy')
  ),
  company_quote_request_id uuid references public.company_quote_requests (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.count_organization_seats(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select count(*)::integer
      from (
        select tm.id
        from public.team_members tm
        where tm.organization_id = p_organization_id
          and tm.status = 'active'
        union all
        select ti.id
        from public.team_invitations ti
        where ti.organization_id = p_organization_id
          and ti.accepted_at is null
          and ti.revoked_at is null
          and ti.expires_at > now()
      ) seats
    ),
    0
  );
$$;

create or replace function public.organization_seat_limit(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select oe.seat_limit
  from public.organization_entitlements oe
  where oe.organization_id = p_organization_id;
$$;

create or replace function public.can_add_organization_seat(p_organization_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
begin
  v_limit := public.organization_seat_limit(p_organization_id);

  if v_limit is null then
    return true;
  end if;

  v_used := public.count_organization_seats(p_organization_id);
  return v_used < v_limit;
end;
$$;

-- Seat check on invite acceptance (pending invite already counts toward usage).
create or replace function public.accept_team_invitation_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.team_invitations%rowtype;
  v_user_email text;
  v_existing_member public.team_members%rowtype;
  v_limit integer;
  v_used integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'Sign in to accept this invitation.');
  end if;

  select lower(email) into v_user_email
  from auth.users
  where id = auth.uid();

  select * into v_invitation
  from public.team_invitations
  where token = p_token
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if v_invitation.id is null then
    return jsonb_build_object('success', false, 'error', 'This invitation is invalid or has expired.');
  end if;

  if v_user_email is distinct from lower(v_invitation.email) then
    return jsonb_build_object(
      'success', false,
      'error', 'Sign in with the email address that received this invitation.'
    );
  end if;

  select * into v_existing_member
  from public.team_members
  where organization_id = v_invitation.organization_id
    and lower(email) = lower(v_invitation.email)
  limit 1;

  if v_existing_member.id is not null and v_existing_member.status = 'active' then
    update public.team_invitations
    set accepted_at = now()
    where id = v_invitation.id;

    return jsonb_build_object(
      'success', true,
      'organization_id', v_invitation.organization_id
    );
  end if;

  v_limit := public.organization_seat_limit(v_invitation.organization_id);

  if v_limit is not null then
    v_used := public.count_organization_seats(v_invitation.organization_id);

    if v_existing_member.id is null and v_used >= v_limit then
      return jsonb_build_object(
        'success', false,
        'error', 'This organization has reached its seat limit. Contact your admin.'
      );
    end if;

    if v_existing_member.id is not null
      and v_existing_member.status = 'deactivated'
      and v_used >= v_limit then
      return jsonb_build_object(
        'success', false,
        'error', 'This organization has reached its seat limit. Contact your admin.'
      );
    end if;
  end if;

  if v_existing_member.id is not null then
    update public.team_members
    set
      user_id = auth.uid(),
      role = v_invitation.role,
      status = 'active',
      joined_at = now(),
      deactivated_at = null,
      deactivated_by = null
    where id = v_existing_member.id;
  else
    insert into public.team_members (
      organization_id,
      user_id,
      email,
      display_name,
      role,
      status,
      invited_by,
      joined_at
    )
    values (
      v_invitation.organization_id,
      auth.uid(),
      v_invitation.email,
      split_part(v_invitation.email, '@', 1),
      v_invitation.role,
      'active',
      v_invitation.invited_by,
      now()
    );
  end if;

  update public.team_invitations
  set accepted_at = now()
  where id = v_invitation.id;

  return jsonb_build_object(
    'success', true,
    'organization_id', v_invitation.organization_id
  );
end;
$$;

alter table public.company_quote_requests enable row level security;
alter table public.organization_entitlements enable row level security;

create policy "Org members can view their entitlements"
  on public.organization_entitlements
  for select
  to authenticated
  using (
    organization_id in (
      select tm.organization_id
      from public.team_members tm
      where tm.user_id = auth.uid()
        and tm.status = 'active'
    )
  );

grant execute on function public.count_organization_seats(uuid) to authenticated, service_role;
grant execute on function public.organization_seat_limit(uuid) to authenticated, service_role;
grant execute on function public.can_add_organization_seat(uuid) to authenticated, service_role;
