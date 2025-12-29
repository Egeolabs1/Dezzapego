-- Add 'details' column for dynamic fields (JSONB)
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- Add 'location' column for structured address data (JSONB)
-- This stores city, state, neighborhood, etc. separate from lat/lng
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '{}'::jsonb;

-- Ensure RLS allows update to these columns (implicitly covered by 'true' or standard update policies)

-- Add 'status' column for ad visibility/workflow
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add 'featured' column if missing (used in Home.tsx)
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
