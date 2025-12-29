-- Make specific user admin (Run this with your email)
update public.profiles
set is_admin = true
where id in (select id from auth.users where email = 'ngfilho@gmail.com');
