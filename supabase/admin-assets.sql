create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'user')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create policy "Users can read their own role"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create table if not exists public.admin_assets (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('people', 'objects', 'shapes', 'frames', 'backgrounds', 'blog', 'templates')),
  name text not null,
  alt_text text,
  tags text[] not null default '{}',
  original_url text,
  preview_url text,
  thumbnail_url text,
  mime_type text,
  width integer,
  height integer,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_assets_category_idx on public.admin_assets(category);
create index if not exists admin_assets_published_idx on public.admin_assets(is_published);
create index if not exists admin_assets_sort_idx on public.admin_assets(category, sort_order, created_at desc);

alter table public.admin_assets enable row level security;

create policy "Published admin assets are public"
on public.admin_assets
for select
to anon, authenticated
using (is_published = true);

create policy "Admins can read all admin assets"
on public.admin_assets
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
  )
);

-- The app writes admin assets through server routes using SUPABASE_SERVICE_ROLE_KEY.
-- Do not add public insert/update/delete policies unless you intentionally want direct client writes.

-- Run this after creating your admin user in Supabase Auth.
-- Replace the email with your real admin email.
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'felixmeji4@gmail.com'
on conflict (user_id) do update set role = excluded.role;

-- Create a public Supabase Storage bucket named: admin-assets
-- Dashboard path: Storage > New bucket > admin-assets > Public bucket.
