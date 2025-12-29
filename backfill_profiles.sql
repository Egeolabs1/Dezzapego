-- Backfill missing profiles for existing users
-- This script selects all users from the auth system and inserts a corresponding row
-- into public.profiles if one doesn't already exist.

insert into public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
select 
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url',
  created_at,
  last_sign_in_at
from auth.users
on conflict (id) do nothing;
