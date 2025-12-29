-- Create a table for public profiles
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  phone text,
  email text,
  bio text,
  rating numeric default 0,
  verified boolean default false,
  verification_status text default 'none', -- 'none', 'pending', 'verified', 'rejected'
  verification_docs jsonb, -- { doc_front, doc_back, selfie }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Variable for storage URL (change if needed)
comment on table public.profiles is 'Profile data for each user.';

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Create Policy: Public profiles are viewable by everyone
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

-- 4. Create Policy: Users can insert their own profile
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

-- 5. Create Policy: Users can update their own profile
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 6. Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. (Optional) Backfill for existing users
-- insert into public.profiles (id, email)
-- select id, email from auth.users
-- on conflict do nothing;
