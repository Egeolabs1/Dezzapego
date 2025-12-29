-- Storage Bucket Security Check
-- Run this to verify your storage policies are secure

-- Check storage buckets
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets;

-- Check storage policies for 'ads' bucket
SELECT * FROM storage.policies WHERE bucket_id = 'ads';

-- Recommended Policies:
-- 1. SELECT (public read): Anyone can view images
-- 2. INSERT: Only authenticated users can upload
-- 3. UPDATE: Only the owner can update their images
-- 4. DELETE: Only the owner can delete their images

-- If you see missing policies, you might have security issues.
-- Users should NOT be able to delete other people's images.
