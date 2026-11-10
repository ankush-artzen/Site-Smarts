-- Lookup an auth user id by email for invite retries.
-- Executable by the service role only, so members cannot enumerate accounts.

create or replace function public.user_id_by_email(lookup_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(lookup_email))
  limit 1;
$$;

revoke all on function public.user_id_by_email(text) from public;
revoke all on function public.user_id_by_email(text) from anon;
revoke all on function public.user_id_by_email(text) from authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
