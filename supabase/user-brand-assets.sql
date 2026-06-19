create table if not exists public.user_brand_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  original_path text,
  preview_path text,
  thumbnail_path text,
  mime_type text,
  width integer,
  height integer,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists user_brand_assets_user_idx
on public.user_brand_assets(user_id, created_at desc);

alter table public.user_brand_assets enable row level security;

create policy "Users can read their own brand assets"
on public.user_brand_assets
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own brand assets"
on public.user_brand_assets
for delete
to authenticated
using (auth.uid() = user_id);

-- The app writes uploads through server routes using SUPABASE_SERVICE_ROLE_KEY.
-- Keep direct client inserts disabled unless you intentionally add storage policies.

insert into storage.buckets (id, name, public)
values ('user-brand-assets', 'user-brand-assets', false)
on conflict (id) do nothing;
