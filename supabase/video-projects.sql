create table if not exists public.video_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  project jsonb not null default '{}'::jsonb,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.video_projects
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.video_projects
add column if not exists title text;

alter table public.video_projects
add column if not exists project jsonb not null default '{}'::jsonb;

alter table public.video_projects
add column if not exists thumbnail_url text;

alter table public.video_projects
add column if not exists created_at timestamptz not null default now();

alter table public.video_projects
add column if not exists updated_at timestamptz not null default now();

create index if not exists video_projects_user_updated_idx
on public.video_projects(user_id, updated_at desc);

create index if not exists video_projects_created_idx
on public.video_projects(created_at desc);

alter table public.video_projects enable row level security;

drop policy if exists "Users can read their own video projects" on public.video_projects;
create policy "Users can read their own video projects"
on public.video_projects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own video projects" on public.video_projects;
create policy "Users can create their own video projects"
on public.video_projects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own video projects" on public.video_projects;
create policy "Users can update their own video projects"
on public.video_projects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own video projects" on public.video_projects;
create policy "Users can delete their own video projects"
on public.video_projects
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_video_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_video_projects_updated_at on public.video_projects;
create trigger set_video_projects_updated_at
before update on public.video_projects
for each row
execute function public.set_video_projects_updated_at();
