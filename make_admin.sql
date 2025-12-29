-- Helper script to set a user as Admin
-- Replace 'ngfilho@gmail.com' with the target user's email if different.

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'ngfilho@gmail.com';

-- Verify the change
SELECT id, email, role FROM public.profiles WHERE email = 'ngfilho@gmail.com';
