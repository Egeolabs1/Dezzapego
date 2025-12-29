-- Add is_admin column to profiles if it doesn't exist
alter table public.profiles add column if not exists is_admin boolean default false;

-- Create policy or function to easier check admin
-- (Optional) Secure function to check admin status
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  );
$$;

-- Grant execute
grant execute on function public.is_admin() to authenticated, anon;

-- Update contacts table policy to use is_admin()
drop policy if exists "Admins can view contacts" on public.contacts;
create policy "Admins can view contacts"
  on public.contacts for select
  using (public.is_admin());

drop policy if exists "Admins can update contacts" on public.contacts;
create policy "Admins can update contacts"
  on public.contacts for update
  using (public.is_admin());

drop policy if exists "Admins can delete contacts" on public.contacts;
create policy "Admins can delete contacts"
  on public.contacts for delete
  using (public.is_admin());
