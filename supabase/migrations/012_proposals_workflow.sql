-- Proposal workflow: statuses, portal, revisions, email tracking, signatures.

-- Extend proposals
alter table public.proposals
  add column if not exists expiration_date date,
  add column if not exists assumptions text,
  add column if not exists internal_notes text,
  add column if not exists public_token text unique default encode(gen_random_bytes(32), 'hex'),
  add column if not exists viewed_at timestamptz,
  add column if not exists first_viewed_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists customer_signature_data text,
  add column if not exists customer_signed_at timestamptz,
  add column if not exists customer_signed_name text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists pdf_page_count integer,
  add column if not exists last_emailed_at timestamptz,
  add column if not exists email_send_count integer not null default 0;

create index if not exists proposals_public_token_idx on public.proposals (public_token);
create index if not exists proposals_archived_at_idx on public.proposals (archived_at);
create index if not exists proposals_expiration_date_idx on public.proposals (expiration_date);

-- Migrate legacy statuses
update public.proposals set status = 'Accepted' where status = 'Won';
update public.proposals set status = 'Declined' where status = 'Lost';

alter table public.proposals drop constraint if exists proposals_status_check;
alter table public.proposals
  add constraint proposals_status_check check (
    status in ('Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Expired')
  );

-- Ensure all proposals have portal tokens
update public.proposals
set public_token = encode(gen_random_bytes(32), 'hex')
where public_token is null;

alter table public.proposals alter column public_token set not null;

-- Proposal revisions
create table if not exists public.proposal_revisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  version_number integer not null,
  label text not null default 'Manual save',
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, version_number)
);

create index if not exists proposal_revisions_proposal_idx
  on public.proposal_revisions (proposal_id, created_at desc);

-- Status history
create table if not exists public.proposal_status_history (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists proposal_status_history_proposal_idx
  on public.proposal_status_history (proposal_id, created_at desc);

-- Email log
create table if not exists public.proposal_emails (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sent_by uuid references auth.users (id) on delete set null,
  recipient_email text not null,
  subject text not null,
  message text not null,
  portal_url text not null,
  sent_at timestamptz not null default now()
);

create index if not exists proposal_emails_proposal_idx
  on public.proposal_emails (proposal_id, sent_at desc);

-- View tracking
create table if not exists public.proposal_views (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  viewer_ip text,
  user_agent text
);

create index if not exists proposal_views_proposal_idx
  on public.proposal_views (proposal_id, viewed_at desc);

-- Customer comments
create table if not exists public.proposal_comments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  author_name text not null,
  author_email text,
  body text not null,
  source text not null default 'customer' check (source in ('customer', 'internal')),
  created_at timestamptz not null default now()
);

create index if not exists proposal_comments_proposal_idx
  on public.proposal_comments (proposal_id, created_at desc);

-- RLS for new tables
alter table public.proposal_revisions enable row level security;
alter table public.proposal_status_history enable row level security;
alter table public.proposal_emails enable row level security;
alter table public.proposal_views enable row level security;
alter table public.proposal_comments enable row level security;

create policy "Team can view proposal revisions"
  on public.proposal_revisions for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_view_org_data(p.organization_id)
    )
  );

create policy "Editors can insert proposal revisions"
  on public.proposal_revisions for insert
  with check (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_edit_proposals(p.organization_id)
    )
  );

create policy "Team can view proposal status history"
  on public.proposal_status_history for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_view_org_data(p.organization_id)
    )
  );

create policy "Editors can insert proposal status history"
  on public.proposal_status_history for insert
  with check (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_edit_proposals(p.organization_id)
    )
  );

create policy "Team can view proposal emails"
  on public.proposal_emails for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_view_org_data(p.organization_id)
    )
  );

create policy "Editors can insert proposal emails"
  on public.proposal_emails for insert
  with check (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_edit_proposals(p.organization_id)
    )
  );

create policy "Team can view proposal views"
  on public.proposal_views for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_view_org_data(p.organization_id)
    )
  );

create policy "Team can view proposal comments"
  on public.proposal_comments for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_view_org_data(p.organization_id)
    )
  );

create policy "Editors can insert internal proposal comments"
  on public.proposal_comments for insert
  with check (
    source = 'internal'
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_edit_proposals(p.organization_id)
    )
  );

-- Portal RPC: fetch proposal by public token
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

create or replace function public.record_proposal_portal_view(
  p_token text,
  p_viewer_ip text default null,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_id uuid;
  v_status text;
begin
  select id, status into v_proposal_id, v_status
  from public.proposals
  where public_token = p_token
    and archived_at is null
  limit 1;

  if v_proposal_id is null then
    return false;
  end if;

  insert into public.proposal_views (proposal_id, viewer_ip, user_agent)
  values (v_proposal_id, p_viewer_ip, p_user_agent);

  update public.proposals
  set
    first_viewed_at = coalesce(first_viewed_at, now()),
    viewed_at = now(),
    status = case
      when status = 'Sent' then 'Viewed'
      else status
    end
  where id = v_proposal_id
    and status in ('Sent', 'Viewed');

  if v_status = 'Sent' then
    insert into public.proposal_status_history (
      proposal_id,
      organization_id,
      previous_status,
      new_status,
      note
    )
    select id, organization_id, 'Sent', 'Viewed', 'Customer viewed proposal portal'
    from public.proposals
    where id = v_proposal_id;
  end if;

  return true;
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
    v_new_status := 'Accepted';
    update public.proposals
    set
      status = v_new_status,
      accepted_at = now(),
      decided_at = now(),
      customer_signed_at = now(),
      customer_signed_name = coalesce(nullif(trim(p_signer_name), ''), customer_signature_name),
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
    insert into public.proposal_comments (
      proposal_id,
      author_name,
      author_email,
      body,
      source
    )
    values (
      v_proposal.id,
      coalesce(nullif(trim(p_signer_name), ''), 'Customer'),
      null,
      trim(p_comment),
      'customer'
    );
  end if;

  return jsonb_build_object('success', true, 'status', v_new_status);
end;
$$;

grant execute on function public.get_proposal_by_portal_token(text) to anon, authenticated, service_role;
grant execute on function public.record_proposal_portal_view(text, text, text) to anon, authenticated, service_role;
grant execute on function public.submit_proposal_portal_response(text, text, text, text, text) to anon, authenticated, service_role;
