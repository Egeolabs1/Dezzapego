-- 1. Add Coordinates to Ads
-- Note: handling nullable for existing ads
alter table public.ads add column if not exists lat float;
alter table public.ads add column if not exists lng float;

-- 2. Create optimized index for location queries
create index if not exists ads_lat_lng_idx on public.ads (lat, lng);

-- 3. Create generic "get_nearby_ads" function using Haversine formula
-- Returns ads within X kilometers
-- Also supports standard filtering arguments to be flexible or we can mix it in application layer
-- For simplicity, this RPC just filters by distance. Application layer can combine ID lists or we can duplicate filter logic here.

create or replace function public.get_nearby_ads(
  user_lat float,
  user_lng float,
  radius_km float
)
returns table (id uuid, lat float, lng float, dist_km float)
language sql
as $$
  select
    id,
    lat,
    lng,
    (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(lat)) * cos(radians(lng) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(lat))
      )
    ) as dist_km
  from public.ads
  where
    lat is not null and lng is not null
    and (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(lat)) * cos(radians(lng) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(lat))
      )
    ) < radius_km;
$$;
