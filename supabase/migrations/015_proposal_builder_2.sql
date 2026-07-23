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
  using (public.can_view_org_data(organization_id));

create policy "proposal_media_insert_org"
  on public.proposal_media for insert
  with check (public.can_edit_proposals(organization_id));

create policy "proposal_media_update_org"
  on public.proposal_media for update
  using (public.can_edit_proposals(organization_id));

create policy "proposal_media_delete_org"
  on public.proposal_media for delete
  using (public.can_edit_proposals(organization_id));

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
