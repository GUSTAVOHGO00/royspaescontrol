drop policy if exists roys_employees_store_insert on public.roys_employees;
drop policy if exists roys_employees_admin_all on public.roys_employees;
drop policy if exists roys_employees_scoped_select on public.roys_employees;
create policy roys_employees_select on public.roys_employees for select to authenticated
using (public.roys_is_admin() or unit_id=(select unit_id from public.roys_profiles where user_id=(select auth.uid()) and role='store' and active));
create policy roys_employees_insert on public.roys_employees for insert to authenticated
with check (public.roys_is_admin() or (unit_id=(select unit_id from public.roys_profiles where user_id=(select auth.uid()) and role='store' and active) and source='store' and created_by=(select auth.uid())));
create policy roys_employees_admin_update on public.roys_employees for update to authenticated
using (public.roys_is_admin()) with check (public.roys_is_admin());
create policy roys_employees_admin_delete on public.roys_employees for delete to authenticated
using (public.roys_is_admin());
drop index if exists public.roys_closings_corrects_id_idx;
revoke execute on function public.roys_is_admin(uuid) from authenticated;
