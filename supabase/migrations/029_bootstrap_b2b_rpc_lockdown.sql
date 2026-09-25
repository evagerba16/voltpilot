-- Restrict B2B bootstrap RPC to service role only (PostgREST / anon must not execute).

revoke execute on function public.bootstrap_b2b_owner_organization(uuid, text, text)
  from anon, authenticated;

grant execute on function public.bootstrap_b2b_owner_organization(uuid, text, text)
  to service_role;
