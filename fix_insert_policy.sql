-- Fix INSERT Policy for ads table
-- This ensures users can only create ads with their own user_id

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own ads" ON public.ads;

-- Create new INSERT policy with proper user_id verification
CREATE POLICY "Users can insert their own ads"
ON public.ads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'ads' AND cmd = 'INSERT';
