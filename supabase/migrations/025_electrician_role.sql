-- Add electrician team role for field staff who work on jobs without admin access.

alter table public.team_members
  drop constraint if exists team_members_role_check;

alter table public.team_members
  add constraint team_members_role_check
  check (
    role in (
      'owner',
      'admin',
      'estimator',
      'project_manager',
      'viewer',
      'electrician'
    )
  );

alter table public.team_invitations
  drop constraint if exists team_invitations_role_check;

alter table public.team_invitations
  add constraint team_invitations_role_check
  check (
    role in (
      'admin',
      'estimator',
      'project_manager',
      'viewer',
      'electrician'
    )
  );

create or replace function public.can_edit_projects(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(org_id), '') in (
    'owner', 'admin', 'estimator', 'project_manager', 'electrician'
  );
$$;
