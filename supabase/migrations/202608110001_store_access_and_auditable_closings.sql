create extension if not exists pgcrypto;

alter table public.roys_profiles drop constraint if exists roys_profiles_role_check;
alter table public.roys_profiles add column if not exists username text;
alter table public.roys_profiles add column if not exists last_access_at timestamptz;
alter table public.roys_profiles add constraint roys_profiles_role_check
  check (role in ('admin', 'manager', 'store'));
create unique index if not exists roys_profiles_username_unique
  on public.roys_profiles (lower(username)) where username is not null;
create index if not exists roys_profiles_unit_id_idx on public.roys_profiles(unit_id);

create table if not exists public.roys_employees (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.roys_units(id),
  name text not null check (length(trim(name)) >= 2),
  active boolean not null default true,
  source text not null default 'admin' check (source in ('admin', 'store')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists roys_employees_unit_name_unique
  on public.roys_employees(unit_id, lower(regexp_replace(trim(name), '\s+', ' ', 'g')));
create index if not exists roys_employees_unit_id_idx on public.roys_employees(unit_id);
create index if not exists roys_employees_created_by_idx on public.roys_employees(created_by);

create table if not exists public.roys_catalog_items (
  code text primary key,
  label text not null,
  section text not null check (section in ('regular', 'essential', 'offers')),
  bread_factor numeric not null check (bread_factor > 0),
  active boolean not null default true
);
insert into public.roys_catalog_items(code,label,section,bread_factor) values
('smart','Subs Smart','regular',0.5),('super','Subs Super','regular',1),
('combo-smart','Combos Smart','regular',0.5),('combo-super','Combos Super','regular',1),
('integrator','Integrador Padrão','regular',0.5),
('essential-1','Roy''s Essential 1','essential',0.5),('essential-2','Roy''s Essential 2','essential',1),
('double-smash','Double Smash','offers',1),('crispy-lover','Crispy Lover','offers',1),
('trio-mix','Trio Mix','offers',1.5),('big-king','Big King','offers',2),('mega-mix','Mega Mix','offers',2)
on conflict(code) do update set label=excluded.label,section=excluded.section,bread_factor=excluded.bread_factor;

alter table public.roys_closings add column if not exists unit_id uuid references public.roys_units(id);
alter table public.roys_closings add column if not exists employee_id uuid references public.roys_employees(id);
alter table public.roys_closings add column if not exists business_date date;
alter table public.roys_closings add column if not exists protocol text;
alter table public.roys_closings add column if not exists idempotency_key uuid;
alter table public.roys_closings add column if not exists alert_level text;
alter table public.roys_closings add column if not exists submission_state text default 'complete';
alter table public.roys_closings add column if not exists client_local_at timestamptz;
alter table public.roys_closings add column if not exists submitted_at timestamptz default now();
update public.roys_closings set business_date=closing_date where business_date is null;
update public.roys_closings set protocol='LEGACY-'||upper(substr(replace(id::text,'-',''),1,12)) where protocol is null;
update public.roys_closings set idempotency_key=id where idempotency_key is null;
update public.roys_closings set alert_level=case when difference=0 then 'correct' when abs(difference)<=2 then 'small' when abs(difference)<=5 then 'attention' when abs(difference)<=10 then 'relevant' else 'critical' end where alert_level is null;
update public.roys_closings set submitted_at=created_at where submitted_at is null;
alter table public.roys_closings alter column business_date set not null;
alter table public.roys_closings alter column protocol set not null;
alter table public.roys_closings alter column idempotency_key set not null;
alter table public.roys_closings alter column alert_level set not null;
alter table public.roys_closings alter column submission_state set not null;
alter table public.roys_closings alter column submitted_at set not null;
create unique index if not exists roys_closings_protocol_unique on public.roys_closings(protocol);
create unique index if not exists roys_closings_idempotency_unique on public.roys_closings(submitted_by,idempotency_key) where submitted_by is not null;
create index if not exists roys_closings_unit_id_idx on public.roys_closings(unit_id);
create index if not exists roys_closings_employee_id_idx on public.roys_closings(employee_id);
create index if not exists roys_closings_submitted_by_idx on public.roys_closings(submitted_by);
create index if not exists roys_closings_corrects_id_idx on public.roys_closings(corrects_id);

create table if not exists public.roys_closing_justifications (
  id uuid primary key default gen_random_uuid(),
  closing_id uuid not null unique references public.roys_closings(id),
  reason_code text not null check (reason_code in ('waste_unreported','courtesy_unreported','count_error','system_error','store_transfer','internal_consumption','other')),
  explanation text not null check (length(trim(explanation)) >= 3),
  submitted_by uuid not null references auth.users(id),
  justified_at timestamptz not null default now()
);
create index if not exists roys_closing_justifications_submitted_by_idx on public.roys_closing_justifications(submitted_by);

create table if not exists public.roys_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists roys_audit_events_actor_id_idx on public.roys_audit_events(actor_id);
create index if not exists roys_audit_events_created_at_idx on public.roys_audit_events(created_at desc);

create or replace function public.roys_alert_level(value numeric)
returns text language sql immutable strict set search_path='' as $$
  select case when abs(value)<0.001 then 'correct' when abs(value)<=2 then 'small'
    when abs(value)<=5 then 'attention' when abs(value)<=10 then 'relevant' else 'critical' end
$$;

create or replace function public.roys_is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.roys_profiles p where p.user_id=uid and p.role='admin' and p.active)
$$;
revoke all on function public.roys_is_admin(uuid) from public,anon;
grant execute on function public.roys_is_admin(uuid) to authenticated;

create or replace function public.roys_prevent_closing_mutation()
returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Fechamentos originais são imutáveis.'; end $$;
drop trigger if exists roys_closings_immutable on public.roys_closings;
create trigger roys_closings_immutable before update or delete on public.roys_closings
for each row execute function public.roys_prevent_closing_mutation();

create or replace function public.submit_store_closing(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  caller uuid:=auth.uid(); profile public.roys_profiles; employee public.roys_employees;
  existing public.roys_closings; new_id uuid; idem uuid; business_day date; shift_value text;
  counts jsonb; report jsonb; physical_value numeric; system_value numeric; difference_value numeric;
  level_value text; state_value text; protocol_value text; submitted_value timestamptz:=now(); item record;
begin
  if caller is null then raise exception 'Autenticação obrigatória.' using errcode='42501'; end if;
  select * into profile from public.roys_profiles where user_id=caller and role='store' and active;
  if not found or profile.unit_id is null then raise exception 'Acesso operacional inválido.' using errcode='42501'; end if;
  idem:=(payload->>'idempotencyKey')::uuid;
  select * into existing from public.roys_closings where submitted_by=caller and idempotency_key=idem;
  if found then return jsonb_build_object('closingId',existing.id,'protocol',existing.protocol,'difference',existing.difference,'alertLevel',existing.alert_level,'submissionState',existing.submission_state,'submittedAt',existing.submitted_at); end if;
  select * into employee from public.roys_employees where id=(payload->>'employeeId')::uuid and unit_id=profile.unit_id and active;
  if not found then raise exception 'Funcionário inválido para esta unidade.' using errcode='42501'; end if;
  business_day:=(payload->>'businessDate')::date; shift_value:=trim(payload->>'shift'); counts:=payload->'counts'; report:=payload->'report';
  if shift_value not in ('Manhã','Tarde','Noite') then raise exception 'Turno inválido.'; end if;
  physical_value:=coalesce((counts#>>'{opening,q30}')::numeric,0)+coalesce((counts#>>'{opening,q15}')::numeric,0)*.5
    +coalesce((counts#>>'{produced,q30}')::numeric,0)+coalesce((counts#>>'{produced,q15}')::numeric,0)*.5
    -coalesce((counts#>>'{waste,q30}')::numeric,0)-coalesce((counts#>>'{waste,q15}')::numeric,0)*.5
    -coalesce((counts#>>'{courtesy,q30}')::numeric,0)-coalesce((counts#>>'{courtesy,q15}')::numeric,0)*.5
    -coalesce((counts#>>'{leftover,q30}')::numeric,0)-coalesce((counts#>>'{leftover,q15}')::numeric,0)*.5;
  if physical_value<0 then raise exception 'Movimentação física inválida.'; end if;
  system_value:=0;
  for item in select code,bread_factor from public.roys_catalog_items where active loop
    system_value:=system_value+coalesce((report->>item.code)::numeric,0)*item.bread_factor;
  end loop;
  difference_value:=system_value-physical_value; level_value:=public.roys_alert_level(difference_value);
  state_value:=case when level_value='correct' then 'complete' else 'awaiting_justification' end;
  new_id:=gen_random_uuid(); protocol_value:='ROY-'||to_char(submitted_value at time zone 'America/Sao_Paulo','YYYYMMDD')||'-'||upper(substr(replace(new_id::text,'-',''),1,6));
  insert into public.roys_closings(id,revision,catalog_version,closing_date,business_date,shift,unit_name,unit_id,responsible,employee_id,created_by_role,counts,report,report_mode,parsed_items,document_metadata,document_path,physical,system,difference,status,alert_level,submission_state,protocol,idempotency_key,client_local_at,submitted_by,created_at,submitted_at)
  values(new_id,1,'V5',business_day,business_day,shift_value,(select name from public.roys_units where id=profile.unit_id),profile.unit_id,employee.name,employee.id,'employee',counts,report,coalesce(payload->>'reportMode','manual'),coalesce(payload->'parsedItems','[]'::jsonb),payload->'documentMetadata',payload->>'documentPath',physical_value,system_value,difference_value,case when level_value='correct' then 'balanced' when level_value in ('small','attention') then 'attention' else 'critical' end,level_value,state_value,protocol_value,idem,nullif(payload->>'clientLocalAt','')::timestamptz,caller,submitted_value,submitted_value);
  update public.roys_profiles set last_access_at=submitted_value,updated_at=submitted_value where user_id=caller;
  return jsonb_build_object('closingId',new_id,'protocol',protocol_value,'difference',difference_value,'alertLevel',level_value,'submissionState',state_value,'submittedAt',submitted_value);
end $$;
revoke all on function public.submit_store_closing(jsonb) from public,anon;
grant execute on function public.submit_store_closing(jsonb) to authenticated;

create or replace function public.justify_store_closing(closing_id uuid,reason_code text,explanation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); closing public.roys_closings; justified_value timestamptz:=now();
begin
  select * into closing from public.roys_closings where id=closing_id and submitted_by=caller;
  if not found then raise exception 'Fechamento não encontrado.' using errcode='42501'; end if;
  if closing.alert_level='correct' then raise exception 'Este fechamento não exige justificativa.'; end if;
  if reason_code not in ('waste_unreported','courtesy_unreported','count_error','system_error','store_transfer','internal_consumption','other') then raise exception 'Motivo inválido.'; end if;
  if length(trim(explanation))<3 then raise exception 'Informe uma justificativa.'; end if;
  if closing.alert_level in ('relevant','critical') and length(trim(explanation))<30 then raise exception 'Descreva o ocorrido com pelo menos 30 caracteres.'; end if;
  insert into public.roys_closing_justifications(closing_id,reason_code,explanation,submitted_by,justified_at)
  values(closing.id,reason_code,trim(explanation),caller,justified_value)
  on conflict(closing_id) do nothing;
  return jsonb_build_object('closingId',closing.id,'protocol',closing.protocol,'difference',closing.difference,'alertLevel',closing.alert_level,'submissionState','complete','submittedAt',closing.submitted_at,'justifiedAt',justified_value);
end $$;
revoke all on function public.justify_store_closing(uuid,text,text) from public,anon;
grant execute on function public.justify_store_closing(uuid,text,text) to authenticated;

alter table public.roys_units enable row level security;
alter table public.roys_profiles enable row level security;
alter table public.roys_employees enable row level security;
alter table public.roys_catalog_items enable row level security;
alter table public.roys_closings enable row level security;
alter table public.roys_closing_justifications enable row level security;
alter table public.roys_audit_events enable row level security;

drop policy if exists roys_profiles_self on public.roys_profiles;
create policy roys_profiles_self on public.roys_profiles for select to authenticated using ((select auth.uid())=user_id or public.roys_is_admin());
drop policy if exists roys_units_scoped on public.roys_units;
create policy roys_units_scoped on public.roys_units for select to authenticated using (public.roys_is_admin() or id=(select unit_id from public.roys_profiles where user_id=(select auth.uid()) and active));
drop policy if exists roys_employees_scoped_select on public.roys_employees;
create policy roys_employees_scoped_select on public.roys_employees for select to authenticated using (public.roys_is_admin() or unit_id=(select unit_id from public.roys_profiles where user_id=(select auth.uid()) and role='store' and active));
drop policy if exists roys_employees_store_insert on public.roys_employees;
create policy roys_employees_store_insert on public.roys_employees for insert to authenticated with check (unit_id=(select unit_id from public.roys_profiles where user_id=(select auth.uid()) and role='store' and active) and source='store' and created_by=(select auth.uid()));
drop policy if exists roys_employees_admin_all on public.roys_employees;
create policy roys_employees_admin_all on public.roys_employees for all to authenticated using (public.roys_is_admin()) with check (public.roys_is_admin());
drop policy if exists roys_catalog_authenticated_select on public.roys_catalog_items;
create policy roys_catalog_authenticated_select on public.roys_catalog_items for select to authenticated using (active);
drop policy if exists roys_closings_admin_select on public.roys_closings;
create policy roys_closings_admin_select on public.roys_closings for select to authenticated using (public.roys_is_admin());
drop policy if exists roys_justifications_admin_select on public.roys_closing_justifications;
create policy roys_justifications_admin_select on public.roys_closing_justifications for select to authenticated using (public.roys_is_admin());
drop policy if exists roys_audit_admin_select on public.roys_audit_events;
create policy roys_audit_admin_select on public.roys_audit_events for select to authenticated using (public.roys_is_admin());

revoke all on public.roys_units,public.roys_profiles,public.roys_employees,public.roys_catalog_items,public.roys_closings,public.roys_closing_justifications,public.roys_audit_events from anon;
grant select on public.roys_units,public.roys_profiles,public.roys_employees,public.roys_catalog_items to authenticated;
grant insert on public.roys_employees to authenticated;
grant select on public.roys_closings,public.roys_closing_justifications,public.roys_audit_events to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('roys-closing-evidence','roys-closing-evidence',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists roys_evidence_store_insert on storage.objects;
create policy roys_evidence_store_insert on storage.objects for insert to authenticated with check (
  bucket_id='roys-closing-evidence' and (storage.foldername(name))[1]=(select unit_id::text from public.roys_profiles where user_id=(select auth.uid()) and role='store' and active)
);
drop policy if exists roys_evidence_admin_select on storage.objects;
create policy roys_evidence_admin_select on storage.objects for select to authenticated using (bucket_id='roys-closing-evidence' and public.roys_is_admin());
