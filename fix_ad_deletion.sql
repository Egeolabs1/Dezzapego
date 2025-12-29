-- Comprehensive Ad Deletion Fix (v3)
-- This script handles columns, permissions, foreign keys, and cascading deletes.

-- 0. Ensure 'role' column exists in profiles (Fixes Error 42703)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 1. Grant Delete Policy for Users (Owners)
DROP POLICY IF EXISTS "Users can delete their own ads" ON public.ads;
CREATE POLICY "Users can delete their own ads"
ON public.ads
FOR DELETE
USING (auth.uid() = user_id);

-- 2. Grant Delete Policy for Admins
DROP POLICY IF EXISTS "Admins can delete any ad" ON public.ads;
CREATE POLICY "Admins can delete any ad"
ON public.ads
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 3. Fix Foreign Keys (CASCADE DELETE)
-- This ensures that when an ad is deleted, all 'children' rows are deleted too.

-- Favorites
ALTER TABLE public.favorites
DROP CONSTRAINT IF EXISTS favorites_ad_id_fkey,
ADD CONSTRAINT favorites_ad_id_fkey
FOREIGN KEY (ad_id)
REFERENCES public.ads(id)
ON DELETE CASCADE;

-- Reports
ALTER TABLE public.reports
DROP CONSTRAINT IF EXISTS reports_ad_id_fkey,
ADD CONSTRAINT reports_ad_id_fkey
FOREIGN KEY (ad_id)
REFERENCES public.ads(id)
ON DELETE CASCADE;

-- Notifications (if linked to ads)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'ad_id') THEN
        ALTER TABLE public.notifications
        DROP CONSTRAINT IF EXISTS notifications_ad_id_fkey;
        
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_ad_id_fkey
        FOREIGN KEY (ad_id)
        REFERENCES public.ads(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Messages/Chats (if linked directly to AD)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'ad_id') THEN
        ALTER TABLE public.messages
        DROP CONSTRAINT IF EXISTS messages_ad_id_fkey;
        
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_ad_id_fkey
        FOREIGN KEY (ad_id)
        REFERENCES public.ads(id)
        ON DELETE CASCADE;
    END IF;
END $$;
