create or replace function public.set_employee_active(employee_id uuid, active_value boolean)
returns void language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();
begin
  if caller is null or not public.roys_is_admin(caller) then raise exception 'Acesso administrativo obrigatório.' using errcode='42501'; end if;
  update public.roys_employees set active=active_value,updated_at=now() where id=employee_id;
  if not found then raise exception 'Funcionário não encontrado.'; end if;
  insert into public.roys_audit_events(actor_id,action,entity_type,entity_id,details)
  values(caller,case when active_value then 'employee_activated' else 'employee_deactivated' end,'employee',employee_id::text,'{}'::jsonb);
end $$;
revoke all on function public.set_employee_active(uuid,boolean) from public,anon;
grant execute on function public.set_employee_active(uuid,boolean) to authenticated;

create or replace function public.create_admin_closing_correction(original_id uuid, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  caller uuid:=auth.uid(); original public.roys_closings; new_id uuid:=gen_random_uuid();
  counts_value jsonb; report_value jsonb; physical_value numeric; system_value numeric:=0;
  difference_value numeric; level_value text; revision_value integer; protocol_value text; now_value timestamptz:=now(); item record;
  explanation_value text:=trim(coalesce(payload->>'explanation',''));
begin
  if caller is null or not public.roys_is_admin(caller) then raise exception 'Acesso administrativo obrigatório.' using errcode='42501'; end if;
  if length(explanation_value)<10 then raise exception 'Explique a correção em pelo menos 10 caracteres.'; end if;
  select * into original from public.roys_closings where id=original_id;
  if not found then raise exception 'Fechamento original não encontrado.'; end if;
  counts_value:=coalesce(payload->'counts',original.counts); report_value:=coalesce(payload->'report',original.report);
  physical_value:=coalesce((counts_value#>>'{opening,q30}')::numeric,0)+coalesce((counts_value#>>'{opening,q15}')::numeric,0)*.5
    +coalesce((counts_value#>>'{produced,q30}')::numeric,0)+coalesce((counts_value#>>'{produced,q15}')::numeric,0)*.5
    -coalesce((counts_value#>>'{waste,q30}')::numeric,0)-coalesce((counts_value#>>'{waste,q15}')::numeric,0)*.5
    -coalesce((counts_value#>>'{courtesy,q30}')::numeric,0)-coalesce((counts_value#>>'{courtesy,q15}')::numeric,0)*.5
    -coalesce((counts_value#>>'{leftover,q30}')::numeric,0)-coalesce((counts_value#>>'{leftover,q15}')::numeric,0)*.5;
  if physical_value<0 then raise exception 'Movimentação física inválida.'; end if;
  for item in select code,bread_factor from public.roys_catalog_items where active loop
    system_value:=system_value+coalesce((report_value->>item.code)::numeric,0)*item.bread_factor;
  end loop;
  difference_value:=system_value-physical_value; level_value:=public.roys_alert_level(difference_value);
  select coalesce(max(revision),0)+1 into revision_value from public.roys_closings where id=original_id or corrects_id=original_id;
  protocol_value:='ROY-COR-'||to_char(now_value at time zone 'America/Sao_Paulo','YYYYMMDD')||'-'||upper(substr(replace(new_id::text,'-',''),1,6));
  insert into public.roys_closings(id,revision,corrects_id,catalog_version,closing_date,business_date,shift,unit_name,unit_id,responsible,employee_id,created_by_role,counts,report,report_mode,parsed_items,document_metadata,document_path,physical,system,difference,status,justification,submitted_by,created_at,protocol,idempotency_key,alert_level,submission_state,client_local_at,submitted_at)
  values(new_id,revision_value,original_id,original.catalog_version,original.closing_date,original.business_date,original.shift,original.unit_name,original.unit_id,original.responsible,original.employee_id,'admin',counts_value,report_value,original.report_mode,original.parsed_items,original.document_metadata,original.document_path,physical_value,system_value,difference_value,case when level_value='correct' then 'balanced' when level_value in ('small','attention') then 'attention' else 'critical' end,explanation_value,caller,now_value,protocol_value,gen_random_uuid(),level_value,'complete',now_value,now_value);
  insert into public.roys_audit_events(actor_id,action,entity_type,entity_id,details)
  values(caller,'admin_correction_created','closing',new_id::text,jsonb_build_object('originalId',original_id,'revision',revision_value,'explanation',explanation_value));
  return jsonb_build_object('closingId',new_id,'protocol',protocol_value,'difference',difference_value,'alertLevel',level_value,'revision',revision_value);
end $$;
revoke all on function public.create_admin_closing_correction(uuid,jsonb) from public,anon;
grant execute on function public.create_admin_closing_correction(uuid,jsonb) to authenticated;
