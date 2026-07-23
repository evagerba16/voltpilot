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
