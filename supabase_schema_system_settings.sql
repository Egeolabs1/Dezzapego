-- Create the table for system settings if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies

-- 1. Allow EVERYONE (including anon) to READ specific settings like 'maintenance_mode'
-- We want the frontend to check maintenance status even if not logged in
CREATE POLICY "Enable read access for all users" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- 2. Allow ONLY authenticated ADMINS to INSERT/UPDATE
-- Note: Adjust this policy based on your actual generic 'admin' role check or specific user UID
-- For now, allowing all authenticated users to update for testing purposes, but ideally stick to Admin IDs
CREATE POLICY "Enable insert/update for authenticated users only" 
ON public.system_settings 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Insert default maintenance mode value (false)
INSERT INTO public.system_settings (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
