-- Restore authenticated access to the RLS helper without exposing cross-user checks.
create or replace function public.roys_is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    uid = (select auth.uid())
    and exists (
      select 1
      from public.roys_profiles p
      where p.user_id = (select auth.uid())
        and p.role = 'admin'
        and p.active
    )
$function$;

revoke all on function public.roys_is_admin(uuid) from public;
revoke all on function public.roys_is_admin(uuid) from anon;
grant execute on function public.roys_is_admin(uuid) to authenticated;
