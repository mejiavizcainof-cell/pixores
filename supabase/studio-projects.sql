create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  project_data jsonb not null default '{}'::jsonb,
  thumbnail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.projects
add column if not exists name text;

alter table public.projects
add column if not exists project_data jsonb not null default '{}'::jsonb;

alter table public.projects
add column if not exists thumbnail text;

alter table public.projects
add column if not exists created_at timestamptz not null default now();

alter table public.projects
add column if not exists updated_at timestamptz not null default now();

create index if not exists projects_user_updated_idx
on public.projects(user_id, updated_at desc);

create index if not exists projects_user_created_idx
on public.projects(user_id, created_at desc);

alter table public.projects enable row level security;

drop policy if exists "Users can read their own projects" on public.projects;
create policy "Users can read their own projects"
on public.projects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own projects" on public.projects;
create policy "Users can create their own projects"
on public.projects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
on public.projects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
on public.projects
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_projects_updated_at();
