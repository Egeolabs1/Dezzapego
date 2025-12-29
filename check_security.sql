-- Security Verification Script
-- This script checks for common RLS pitfalls.
-- Run this in Supabase SQL Editor.

-- 1. Check if RLS is enabled on critical tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('ads', 'profiles', 'favorites', 'reports', 'messages', 'notifications');

-- 2. Check existing policies for 'ads'
SELECT * FROM pg_policies WHERE tablename = 'ads';

-- 3. Check for public write access (DANGEROUS if found)
-- Specifically looking for 'anon' or 'public' roles having DEFAULT INSERT/UPDATE privileges if RLS is off (unlikely in Supabase default, but good to check).

-- 4. Recommended Policy Audit (Visual Check)
-- policyname: "Users can update own ads" -> (auth.uid() = user_id)
-- policyname: "Users can insert ads" -> (auth.uid() = user_id)
-- policyname: "Public can view active ads" -> (status = 'active')

-- NOTE: If you see "Enable RLS" failures in your dashboard logs, checking 'rowsecurity' = true is step #1.
