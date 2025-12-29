-- 1. Favorites Table
create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  ad_id uuid references public.ads not null,
  created_at timestamptz default now(),
  unique(user_id, ad_id)
);

alter table public.favorites enable row level security;

create policy "Users can view their own favorites"
  on favorites for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own favorites"
  on favorites for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own favorites"
  on favorites for delete
  using ( auth.uid() = user_id );


-- 2. Reports Table
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  ad_id uuid references public.ads not null,
  user_id uuid references auth.users, -- Optional (reporter)
  reason text not null,
  description text,
  status text default 'pending', -- pending, resolved, dismissed
  created_at timestamptz default now()
);

alter table public.reports enable row level security;

-- Everyone can insert reports
create policy "Everyone can insert reports"
  on reports for insert
  with check ( true );

-- Only admins can view reports (Assuming admin check logic or specific user UUIDs)
-- For MVP: Allow authenticated read or restricting via service_role in Admin Dashboard.
-- We will restrict SELECT to empty for public/anon to be safe.
create policy "No public read access"
  on reports for select
  using ( false );
