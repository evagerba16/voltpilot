-- Run this in the Supabase SQL Editor after 005_projects_enhanced.sql.

alter table public.projects
  add column if not exists pre_archive_status text;

update public.projects
set pre_archive_status = 'Lead'
where status = 'Archived' and pre_archive_status is null;
