-- Create contacts table
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  user_id uuid references auth.users(id),
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.contacts enable row level security;

-- Policies

-- 1. Allow anyone (anon and authenticated) to insert messages
drop policy if exists "Anyone can insert contacts" on public.contacts;
create policy "Anyone can insert contacts"
  on public.contacts for insert
  with check (true);

-- 2. Allow only specific admin to view messages
drop policy if exists "Admins can view contacts" on public.contacts;
create policy "Admins can view contacts"
  on public.contacts for select
  using (public.is_admin());

-- 3. Allow only specific admin to update (mark as read)
drop policy if exists "Admins can update contacts" on public.contacts;
create policy "Admins can update contacts"
  on public.contacts for update
  using (public.is_admin());

-- 4. Allow admin delete
drop policy if exists "Admins can delete contacts" on public.contacts;
create policy "Admins can delete contacts"
  on public.contacts for delete
  using (public.is_admin());

-- Grant permissions
grant insert on public.contacts to anon, authenticated;
grant select, update, delete on public.contacts to service_role;
-- Authenticated users need select permission to query, but RLS will filter rows
grant select, update on public.contacts to authenticated;
