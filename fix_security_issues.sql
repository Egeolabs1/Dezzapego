-- ==========================================
-- Fix Supabase Security Issues
-- ==========================================

-- 1. Enable Row Level Security (RLS)
-- ------------------------------------------
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Policies for audit_logs
-- ------------------------------------------
-- Initial Cleanup: Drop policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;

-- Policy: Only admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy: Allow inserts by authenticated users (e.g., for client-side logging)
-- Adjust 'true' to more restrictive checks if only server-side triggers should insert.
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);


-- 3. Policies for banners
-- ------------------------------------------
DROP POLICY IF EXISTS "Public read access for banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;

-- Policy: Everyone can read banners
CREATE POLICY "Public read access for banners" ON public.banners
FOR SELECT
TO public
USING (true);

-- Policy: Only admins can insert/update/delete banners
CREATE POLICY "Admins can manage banners" ON public.banners
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);


-- 4. Policies for notifications
-- ------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;

-- Policy: Users can see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update (e.g., mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow inserts (e.g., system messages sent by other users actions)
CREATE POLICY "Enable insert for authenticated users" ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);


-- 5. Fix Function Search Paths
-- ------------------------------------------
-- Securing functions by forcing a safe search_path (prevents hijacking)

-- Note: If these functions are overloaded, these commands might require argument types.
-- e.g. ALTER FUNCTION public.get_nearby_ads(float, float, int) SET search_path = public;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.get_nearby_ads SET search_path = public';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter get_nearby_ads (might be missing or overloaded): %', SQLERRM;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.is_admin SET search_path = public';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter is_admin (might be missing or overloaded): %', SQLERRM;
END $$;
