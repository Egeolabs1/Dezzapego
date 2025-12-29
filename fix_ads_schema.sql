-- Add user_id to ads table if it's missing
alter table public.ads 
add column if not exists user_id uuid references auth.users(id);

-- Backfill user_id from seller column if possible (assuming seller->>'id' or similar exists? No, seller JSON doesn't guarantee ID)
-- If ads were created without user_id, we might need to rely on manual fix or clear them.
-- For now, just ensure the column exists so new ads work and AdminUsers query works.

-- Update RLS for ads
alter table public.ads enable row level security;

create policy "Ads are viewable by everyone"
  on public.ads for select
  using ( true );

create policy "Users can insert their own ads"
  on public.ads for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own ads"
  on public.ads for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own ads"
  on public.ads for delete
  using ( auth.uid() = user_id );
