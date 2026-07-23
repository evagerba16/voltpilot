-- Run this in the Supabase SQL Editor after 002_projects.sql.

alter table public.projects
  add column if not exists general_contractor text,
  add column if not exists bid_due_date date,
  add column if not exists assigned_estimator text;

alter table public.projects
  drop constraint if exists projects_status_check;

update public.projects
set status = case status
  when 'Draft' then 'Lead'
  when 'Active' then 'Estimating'
  when 'Submitted' then 'Proposal Sent'
  when 'Awarded' then 'Awarded'
  when 'Completed' then 'Awarded'
  else 'Lead'
end
where status not in (
  'Lead',
  'Estimating',
  'Proposal Sent',
  'Awarded',
  'Lost',
  'Archived'
);

alter table public.projects
  add constraint projects_status_check check (
    status in (
      'Lead',
      'Estimating',
      'Proposal Sent',
      'Awarded',
      'Lost',
      'Archived'
    )
  );

alter table public.projects
  alter column status set default 'Lead';

create index if not exists projects_bid_due_date_idx on public.projects (bid_due_date);
create index if not exists projects_status_active_idx on public.projects (status);
