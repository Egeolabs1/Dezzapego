-- Create a function that allows users to delete their own account
-- This function runs with SECURITY DEFINER to allow access to auth.users
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  -- Prevent accidental deletion if not logged in (shouldnt happen but safety first)
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete from auth.users
  -- This will trigger CASCADE deletes for tables referencing auth.users if configured with ON DELETE CASCADE
  -- If not configured, you might need to manually delete from profiles/ads first
  delete from auth.users where id = current_user_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function delete_own_account() to authenticated;
