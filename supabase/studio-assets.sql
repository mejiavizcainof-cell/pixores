create table if not exists public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  kind text not null check (kind in ('background', 'image', 'frame-image')),
  name text not null,
  original_path text,
  preview_path text,
  thumbnail_path text,
  original_url text,
  preview_url text,
  thumbnail_url text,
  mime_type text,
  width integer,
  height integer,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists studio_assets_user_created_idx
on public.studio_assets(user_id, created_at desc);

create index if not exists studio_assets_project_idx
on public.studio_assets(project_id, created_at desc);

alter table public.studio_assets enable row level security;

drop policy if exists "Users can read their own studio assets" on public.studio_assets;
create policy "Users can read their own studio assets"
on public.studio_assets
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can delete their own studio assets" on public.studio_assets;
create policy "Users can delete their own studio assets"
on public.studio_assets
for delete
to authenticated
using (auth.uid() = user_id);

-- The app writes studio assets through server routes using SUPABASE_SERVICE_ROLE_KEY.
-- Keep direct client inserts disabled.

insert into storage.buckets (id, name, public)
values ('studio-assets', 'studio-assets', true)
on conflict (id) do update set public = excluded.public;
