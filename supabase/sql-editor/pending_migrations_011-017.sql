-- Bundled pending migrations 011,014,015,016,017

-- ===== 011_ai_estimate_assistant.sql =====
-- AI estimate assistant: chat sessions and message history per estimate.

create table if not exists public.estimate_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (estimate_id)
);

create index if not exists estimate_ai_sessions_org_idx
  on public.estimate_ai_sessions (organization_id);

create table if not exists public.estimate_ai_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.estimate_ai_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  recommendations jsonb,
  created_at timestamptz not null default now()
);

create index if not exists estimate_ai_messages_session_idx
  on public.estimate_ai_messages (session_id, created_at);

create or replace function public.set_estimate_ai_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists estimate_ai_sessions_updated_at on public.estimate_ai_sessions;
create trigger estimate_ai_sessions_updated_at
  before update on public.estimate_ai_sessions
  for each row
  execute function public.set_estimate_ai_sessions_updated_at();

alter table public.estimate_ai_sessions enable row level security;
alter table public.estimate_ai_messages enable row level security;

create policy "Team can view estimate AI sessions"
  on public.estimate_ai_sessions for select
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and public.can_view_org_data(e.organization_id)
    )
  );

create policy "Editors can manage estimate AI sessions"
  on public.estimate_ai_sessions for insert
  with check (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and public.can_edit_estimates(e.organization_id)
    )
    and auth.uid() = user_id
  );

create policy "Editors can update estimate AI sessions"
  on public.estimate_ai_sessions for update
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and public.can_edit_estimates(e.organization_id)
    )
  );

create policy "Team can view estimate AI messages"
  on public.estimate_ai_messages for select
  using (
    exists (
      select 1
      from public.estimate_ai_sessions s
      join public.estimates e on e.id = s.estimate_id
      where s.id = session_id
        and public.can_view_org_data(e.organization_id)
    )
  );

create policy "Editors can insert estimate AI messages"
  on public.estimate_ai_messages for insert
  with check (
    exists (
      select 1
      from public.estimate_ai_sessions s
      join public.estimates e on e.id = s.estimate_id
      where s.id = session_id
        and public.can_edit_estimates(e.organization_id)
    )
  );

-- ===== 014_proposal_portal_signature.sql =====
-- Expose customer signature image on the public proposal portal payload.

create or replace function public.get_proposal_by_portal_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_project jsonb;
  v_customer jsonb;
  v_comments jsonb;
begin
  select * into v_proposal
  from public.proposals
  where public_token = p_token
    and archived_at is null
  limit 1;

  if v_proposal.id is null then
    return null;
  end if;

  if v_proposal.expiration_date is not null
     and v_proposal.expiration_date < current_date
     and v_proposal.status not in ('Accepted', 'Declined') then
    update public.proposals
    set status = 'Expired'
    where id = v_proposal.id;
    v_proposal.status := 'Expired';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'project_name', p.project_name,
    'project_address', p.project_address,
    'project_type', p.project_type,
    'general_contractor', p.general_contractor
  )
  into v_project
  from public.projects p
  where p.id = v_proposal.project_id;

  select jsonb_build_object(
    'company_name', c.company_name,
    'contact_name', c.contact_name,
    'email', c.email,
    'phone_number', c.phone_number,
    'project_address', c.project_address
  )
  into v_customer
  from public.customers c
  join public.projects pr on pr.customer_id = c.id
  where pr.id = v_proposal.project_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', pc.id,
      'author_name', pc.author_name,
      'body', pc.body,
      'created_at', pc.created_at
    ) order by pc.created_at asc
  ), '[]'::jsonb)
  into v_comments
  from public.proposal_comments pc
  where pc.proposal_id = v_proposal.id
    and pc.source = 'customer';

  return jsonb_build_object(
    'id', v_proposal.id,
    'title', v_proposal.title,
    'proposal_number', v_proposal.proposal_number,
    'proposal_date', v_proposal.proposal_date,
    'expiration_date', v_proposal.expiration_date,
    'status', v_proposal.status,
    'amount', v_proposal.amount,
    'scope_of_work', v_proposal.scope_of_work,
    'materials_summary', v_proposal.materials_summary,
    'labor_summary', v_proposal.labor_summary,
    'equipment_summary', v_proposal.equipment_summary,
    'assumptions', v_proposal.assumptions,
    'exclusions', v_proposal.exclusions,
    'terms_and_conditions', v_proposal.terms_and_conditions,
    'warranty_information', v_proposal.warranty_information,
    'notes', v_proposal.notes,
    'show_line_item_breakdown', v_proposal.show_line_item_breakdown,
    'customer_signature_name', v_proposal.customer_signature_name,
    'customer_signature_title', v_proposal.customer_signature_title,
    'contractor_signature_name', v_proposal.contractor_signature_name,
    'contractor_signature_title', v_proposal.contractor_signature_title,
    'customer_signed_at', v_proposal.customer_signed_at,
    'customer_signed_name', v_proposal.customer_signed_name,
    'customer_signature_data', v_proposal.customer_signature_data,
    'accepted_at', v_proposal.accepted_at,
    'declined_at', v_proposal.declined_at,
    'estimate_snapshot', v_proposal.estimate_snapshot,
    'company_snapshot', v_proposal.company_snapshot,
    'project', v_project,
    'customer', v_customer,
    'comments', v_comments
  );
end;
$$;

-- ===== 015_proposal_builder_2.sql =====
-- Proposal Builder 2.0: media, branding, customer comments

alter table public.proposals
  add column if not exists customer_logo_url text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_accent_color text;

create table if not exists public.proposal_media (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('photo', 'attachment')),
  url text not null,
  storage_path text,
  title text,
  caption text,
  file_name text,
  file_size bigint,
  mime_type text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists proposal_media_proposal_idx
  on public.proposal_media (proposal_id, sort_order asc, created_at asc);

alter table public.proposal_media enable row level security;

create policy "proposal_media_select_org"
  on public.proposal_media for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "proposal_media_insert_org"
  on public.proposal_media for insert
  with check (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "proposal_media_update_org"
  on public.proposal_media for update
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "proposal_media_delete_org"
  on public.proposal_media for delete
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create or replace function public.submit_proposal_portal_comment(
  p_token text,
  p_author_name text,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_comment_id uuid;
begin
  select * into v_proposal
  from public.proposals
  where public_token = p_token
    and archived_at is null
  limit 1;

  if v_proposal.id is null then
    return jsonb_build_object('success', false, 'error', 'Proposal not found.');
  end if;

  if v_proposal.status in ('Accepted', 'Declined', 'Expired') then
    return jsonb_build_object('success', false, 'error', 'Proposal is no longer open for comments.');
  end if;

  if nullif(trim(p_comment), '') is null then
    return jsonb_build_object('success', false, 'error', 'Comment is required.');
  end if;

  insert into public.proposal_comments (
    proposal_id,
    author_name,
    author_email,
    body,
    source
  )
  values (
    v_proposal.id,
    coalesce(nullif(trim(p_author_name), ''), 'Customer'),
    null,
    trim(p_comment),
    'customer'
  )
  returning id into v_comment_id;

  return jsonb_build_object(
    'success', true,
    'comment_id', v_comment_id
  );
end;
$$;

create or replace function public.get_proposal_by_portal_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_project jsonb;
  v_customer jsonb;
  v_comments jsonb;
  v_media jsonb;
begin
  select * into v_proposal
  from public.proposals
  where public_token = p_token
    and archived_at is null
  limit 1;

  if v_proposal.id is null then
    return null;
  end if;

  if v_proposal.expiration_date is not null
     and v_proposal.expiration_date < current_date
     and v_proposal.status not in ('Accepted', 'Declined') then
    update public.proposals
    set status = 'Expired'
    where id = v_proposal.id;

    insert into public.proposal_status_history (
      proposal_id,
      organization_id,
      previous_status,
      new_status,
      note
    )
    select
      v_proposal.id,
      v_proposal.organization_id,
      v_proposal.status,
      'Expired',
      'Proposal expired automatically'
    where v_proposal.status <> 'Expired';

    v_proposal.status := 'Expired';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'project_name', p.project_name,
    'project_address', p.project_address,
    'project_type', p.project_type,
    'general_contractor', p.general_contractor
  )
  into v_project
  from public.projects p
  where p.id = v_proposal.project_id;

  select jsonb_build_object(
    'company_name', c.company_name,
    'contact_name', c.contact_name,
    'email', c.email,
    'phone_number', c.phone_number,
    'project_address', c.project_address
  )
  into v_customer
  from public.customers c
  join public.projects pr on pr.customer_id = c.id
  where pr.id = v_proposal.project_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', pc.id,
      'author_name', pc.author_name,
      'body', pc.body,
      'created_at', pc.created_at
    ) order by pc.created_at asc
  ), '[]'::jsonb)
  into v_comments
  from public.proposal_comments pc
  where pc.proposal_id = v_proposal.id
    and pc.source = 'customer';

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', pm.id,
      'kind', pm.kind,
      'url', pm.url,
      'title', pm.title,
      'caption', pm.caption,
      'file_name', pm.file_name,
      'file_size', pm.file_size,
      'mime_type', pm.mime_type,
      'sort_order', pm.sort_order
    ) order by pm.sort_order asc, pm.created_at asc
  ), '[]'::jsonb)
  into v_media
  from public.proposal_media pm
  where pm.proposal_id = v_proposal.id;

  return jsonb_build_object(
    'id', v_proposal.id,
    'title', v_proposal.title,
    'proposal_number', v_proposal.proposal_number,
    'proposal_date', v_proposal.proposal_date,
    'expiration_date', v_proposal.expiration_date,
    'status', v_proposal.status,
    'amount', v_proposal.amount,
    'scope_of_work', v_proposal.scope_of_work,
    'materials_summary', v_proposal.materials_summary,
    'labor_summary', v_proposal.labor_summary,
    'equipment_summary', v_proposal.equipment_summary,
    'assumptions', v_proposal.assumptions,
    'exclusions', v_proposal.exclusions,
    'terms_and_conditions', v_proposal.terms_and_conditions,
    'warranty_information', v_proposal.warranty_information,
    'notes', v_proposal.notes,
    'show_line_item_breakdown', v_proposal.show_line_item_breakdown,
    'customer_signature_name', v_proposal.customer_signature_name,
    'customer_signature_title', v_proposal.customer_signature_title,
    'contractor_signature_name', v_proposal.contractor_signature_name,
    'contractor_signature_title', v_proposal.contractor_signature_title,
    'customer_signed_at', v_proposal.customer_signed_at,
    'customer_signed_name', v_proposal.customer_signed_name,
    'customer_signature_data', v_proposal.customer_signature_data,
    'accepted_at', v_proposal.accepted_at,
    'declined_at', v_proposal.declined_at,
    'estimate_snapshot', v_proposal.estimate_snapshot,
    'company_snapshot', v_proposal.company_snapshot,
    'customer_logo_url', v_proposal.customer_logo_url,
    'brand_primary_color', v_proposal.brand_primary_color,
    'brand_accent_color', v_proposal.brand_accent_color,
    'project', v_project,
    'customer', v_customer,
    'comments', v_comments,
    'media', v_media
  );
end;
$$;

grant execute on function public.submit_proposal_portal_comment(text, text, text) to anon, authenticated, service_role;

-- ===== 016_security_hardening.sql =====
-- Security hardening: RLS fixes, RPC auth checks, invitation access, portal limits.

-- Fix proposal_media policies (015 referenced non-existent organization_members).
drop policy if exists "proposal_media_select_org" on public.proposal_media;
drop policy if exists "proposal_media_insert_org" on public.proposal_media;
drop policy if exists "proposal_media_update_org" on public.proposal_media;
drop policy if exists "proposal_media_delete_org" on public.proposal_media;

create policy "Team can view org proposal media"
  on public.proposal_media for select
  using (public.can_view_org_data(organization_id));

create policy "Editors can insert org proposal media"
  on public.proposal_media for insert
  with check (public.can_edit_proposals(organization_id));

create policy "Editors can update org proposal media"
  on public.proposal_media for update
  using (public.can_edit_proposals(organization_id));

create policy "Editors can delete org proposal media"
  on public.proposal_media for delete
  using (public.can_edit_proposals(organization_id));

-- Only allow users to bootstrap their own organization.
create or replace function public.ensure_user_organization(
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
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized organization bootstrap.';
  end if;

  select organization_id
  into v_org_id
  from public.team_members
  where user_id = p_user_id
    and status = 'active'
  order by created_at asc
  limit 1;

  if v_org_id is not null then
    return v_org_id;
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
    set organization_id = excluded.organization_id
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

-- Token-based invitation lookup for invitees (token is the secret).
create or replace function public.get_team_invitation_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.team_invitations%rowtype;
  v_org_name text;
begin
  if nullif(trim(p_token), '') is null then
    return null;
  end if;

  select * into v_invitation
  from public.team_invitations
  where token = p_token
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if v_invitation.id is null then
    return null;
  end if;

  select name into v_org_name
  from public.organizations
  where id = v_invitation.organization_id;

  return jsonb_build_object(
    'id', v_invitation.id,
    'email', v_invitation.email,
    'role', v_invitation.role,
    'expires_at', v_invitation.expires_at,
    'organization', jsonb_build_object(
      'id', v_invitation.organization_id,
      'name', v_org_name
    )
  );
end;
$$;

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

-- Portal input limits and signature validation.
create or replace function public.submit_proposal_portal_comment(
  p_token text,
  p_author_name text,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_comment_id uuid;
begin
  select * into v_proposal
  from public.proposals
  where public_token = p_token
    and archived_at is null
  limit 1;

  if v_proposal.id is null then
    return jsonb_build_object('success', false, 'error', 'Proposal not found.');
  end if;

  if v_proposal.status in ('Accepted', 'Declined', 'Expired') then
    return jsonb_build_object('success', false, 'error', 'Proposal is no longer open for comments.');
  end if;

  if nullif(trim(p_comment), '') is null then
    return jsonb_build_object('success', false, 'error', 'Comment is required.');
  end if;

  if char_length(trim(p_comment)) > 2000 then
    return jsonb_build_object('success', false, 'error', 'Comment is too long.');
  end if;

  insert into public.proposal_comments (
    proposal_id,
    author_name,
    author_email,
    body,
    source
  )
  values (
    v_proposal.id,
    left(coalesce(nullif(trim(p_author_name), ''), 'Customer'), 120),
    null,
    trim(p_comment),
    'customer'
  )
  returning id into v_comment_id;

  return jsonb_build_object(
    'success', true,
    'comment_id', v_comment_id
  );
end;
$$;

create or replace function public.submit_proposal_portal_response(
  p_token text,
  p_action text,
  p_signer_name text default null,
  p_signature_data text default null,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_new_status text;
begin
  select * into v_proposal
  from public.proposals
  where public_token = p_token
    and archived_at is null
  limit 1;

  if v_proposal.id is null then
    return jsonb_build_object('success', false, 'error', 'Proposal not found.');
  end if;

  if v_proposal.status in ('Accepted', 'Declined', 'Expired') then
    return jsonb_build_object('success', false, 'error', 'Proposal is no longer open for response.');
  end if;

  if p_action = 'accept' then
    if p_signature_data is null
       or left(p_signature_data, 22) <> 'data:image/png;base64,'
       or char_length(p_signature_data) > 500000 then
      return jsonb_build_object('success', false, 'error', 'A valid signature is required.');
    end if;

    v_new_status := 'Accepted';
    update public.proposals
    set
      status = v_new_status,
      accepted_at = now(),
      decided_at = now(),
      customer_signed_at = now(),
      customer_signed_name = left(coalesce(nullif(trim(p_signer_name), ''), customer_signature_name), 120),
      customer_signature_data = p_signature_data
    where id = v_proposal.id;
  elsif p_action = 'decline' then
    v_new_status := 'Declined';
    update public.proposals
    set
      status = v_new_status,
      declined_at = now(),
      decided_at = now()
    where id = v_proposal.id;
  else
    return jsonb_build_object('success', false, 'error', 'Invalid action.');
  end if;

  insert into public.proposal_status_history (
    proposal_id,
    organization_id,
    previous_status,
    new_status,
    note
  )
  values (
    v_proposal.id,
    v_proposal.organization_id,
    v_proposal.status,
    v_new_status,
    'Customer ' || p_action || 'ed via portal'
  );

  if nullif(trim(p_comment), '') is not null then
    if char_length(trim(p_comment)) > 2000 then
      return jsonb_build_object('success', false, 'error', 'Comment is too long.');
    end if;

    insert into public.proposal_comments (
      proposal_id,
      author_name,
      author_email,
      body,
      source
    )
    values (
      v_proposal.id,
      left(coalesce(nullif(trim(p_signer_name), ''), 'Customer'), 120),
      null,
      trim(p_comment),
      'customer'
    );
  end if;

  return jsonb_build_object('success', true, 'status', v_new_status);
end;
$$;

grant execute on function public.get_team_invitation_by_token(text) to anon, authenticated, service_role;
grant execute on function public.accept_team_invitation_by_token(text) to authenticated, service_role;

-- ===== 017_portal_project_status.sql =====
-- Sync project status when customers accept/decline via portal.
-- Validate portal comments before mutating proposal state.

create or replace function public.submit_proposal_portal_response(
  p_token text,
  p_action text,
  p_signer_name text default null,
  p_signature_data text default null,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_new_status text;
begin
  select * into v_proposal
  from public.proposals
  where public_token = p_token
    and archived_at is null
  limit 1;

  if v_proposal.id is null then
    return jsonb_build_object('success', false, 'error', 'Proposal not found.');
  end if;

  if v_proposal.status in ('Accepted', 'Declined', 'Expired') then
    return jsonb_build_object('success', false, 'error', 'Proposal is no longer open for response.');
  end if;

  if nullif(trim(p_comment), '') is not null
     and char_length(trim(p_comment)) > 2000 then
    return jsonb_build_object('success', false, 'error', 'Comment is too long.');
  end if;

  if p_action = 'accept' then
    if p_signature_data is null
       or left(p_signature_data, 22) <> 'data:image/png;base64,'
       or char_length(p_signature_data) > 500000 then
      return jsonb_build_object('success', false, 'error', 'A valid signature is required.');
    end if;

    v_new_status := 'Accepted';
    update public.proposals
    set
      status = v_new_status,
      accepted_at = now(),
      decided_at = now(),
      customer_signed_at = now(),
      customer_signed_name = left(coalesce(nullif(trim(p_signer_name), ''), customer_signature_name), 120),
      customer_signature_data = p_signature_data
    where id = v_proposal.id;

    update public.projects
    set status = 'Awarded'
    where id = v_proposal.project_id
      and organization_id = v_proposal.organization_id;
  elsif p_action = 'decline' then
    v_new_status := 'Declined';
    update public.proposals
    set
      status = v_new_status,
      declined_at = now(),
      decided_at = now()
    where id = v_proposal.id;

    update public.projects
    set status = 'Lost'
    where id = v_proposal.project_id
      and organization_id = v_proposal.organization_id;
  else
    return jsonb_build_object('success', false, 'error', 'Invalid action.');
  end if;

  insert into public.proposal_status_history (
    proposal_id,
    organization_id,
    previous_status,
    new_status,
    note
  )
  values (
    v_proposal.id,
    v_proposal.organization_id,
    v_proposal.status,
    v_new_status,
    'Customer ' || p_action || 'ed via portal'
  );

  if nullif(trim(p_comment), '') is not null then
    insert into public.proposal_comments (
      proposal_id,
      author_name,
      author_email,
      body,
      source
    )
    values (
      v_proposal.id,
      left(coalesce(nullif(trim(p_signer_name), ''), 'Customer'), 120),
      null,
      trim(p_comment),
      'customer'
    );
  end if;

  return jsonb_build_object('success', true, 'status', v_new_status);
end;
$$;

grant execute on function public.submit_proposal_portal_response(text, text, text, text, text) to anon, authenticated, service_role;
