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
