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
