-- S02: somente leitura. Preparado para o SQL Editor; NAO executado pelo agente.
-- Retorna um conjunto de linhas (secao, dados JSON). Exportar todas as secoes.
-- Grants efetivos NAO provam acesso a linhas: revisar RLS, triggers e testar por role/base.
-- Nenhuma funcao da aplicacao e chamada; pg_get_functiondef apenas le definicoes.
with
requested(schema_name, table_name) as (
  values ('public', 'driver_assignments'), ('public', 'motoristas'), ('public', 'transactions'),
    ('public', 'profiles'), ('public', 'branches'), ('public', 'vehicles'),
    ('public', 'driver_vehicle_assignments'), ('public', 'driver_checklists'),
    ('public', 'fuel_records'), ('public', 'maintenance_records'),
    ('public', 'maintenance_releases'), ('public', 'vehicle_fuel_consumption_stats'),
    ('storage', 'objects'), ('storage', 'buckets')
),
relations as (
  select r.*, c.oid, c.relowner, c.relacl, c.relkind, c.reloptions,
    c.relrowsecurity, c.relforcerowsecurity, n.oid as schema_oid
  from requested r
  left join pg_catalog.pg_namespace n on n.nspname = r.schema_name
  left join pg_catalog.pg_class c on c.relnamespace = n.oid and c.relname = r.table_name
),
api_roles as (
  select oid, rolname, rolsuper, rolbypassrls, rolinherit
  from pg_catalog.pg_roles
  where rolname in ('anon', 'authenticated', 'service_role')
),
policies as (
  select p.*, n.nspname, c.relname
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private', 'storage')
),
triggers as (
  select t.*, r.schema_name, r.table_name
  from pg_catalog.pg_trigger t join relations r on r.oid = t.tgrelid
  where not t.tgisinternal
),
functions as (
  select p.*, n.nspname
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.prokind in ('f', 'p') and (
    p.prosecdef or n.nspname in ('public', 'private')
    or p.oid in (select tgfoid from triggers)
    or p.oid in (
      select d.refobjid from pg_catalog.pg_depend d
      join policies pol on pol.oid = d.objid
      where d.classid = 'pg_catalog.pg_policy'::regclass
        and d.refclassid = 'pg_catalog.pg_proc'::regclass
    )
  )
),
sections as (
  select '01_relations_rls' as secao, to_jsonb(x) as dado from (
    select schema_name, table_name, oid is not null as exists_in_database,
      relkind, pg_catalog.pg_get_userbyid(relowner) as owner,
      relrowsecurity as rls_enabled, relforcerowsecurity as force_rls, reloptions,
      case when relkind in ('v', 'm') then pg_catalog.pg_get_viewdef(oid, true) end as view_definition
    from relations
  ) x
  union all
  select '02_policies', to_jsonb(x) from (
    select nspname as schema_name, relname as table_name, polname,
      polcmd, polpermissive,
      array(select case when role_oid = 0 then 'PUBLIC'
        else pg_catalog.pg_get_userbyid(role_oid)::text end
        from unnest(polroles) as role_oid) as roles,
      pg_catalog.pg_get_expr(polqual, polrelid) as using_expression,
      pg_catalog.pg_get_expr(polwithcheck, polrelid) as with_check_expression
    from policies
  ) x
  union all
  select '03_table_grants_including_PUBLIC', to_jsonb(x) from (
    select r.schema_name, r.table_name,
      case when a.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee)::text end as grantee,
      pg_catalog.pg_get_userbyid(a.grantor) as grantor, a.privilege_type, a.is_grantable
    from relations r
    cross join lateral pg_catalog.aclexplode(coalesce(r.relacl, pg_catalog.acldefault('r', r.relowner))) a
    where r.oid is not null
  ) x
  union all
  select '04_column_grants', to_jsonb(x) from (
    select r.schema_name, r.table_name, col.attname as column_name,
      case when a.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee)::text end as grantee,
      a.privilege_type, a.is_grantable
    from relations r join pg_catalog.pg_attribute col on col.attrelid = r.oid
    cross join lateral pg_catalog.aclexplode(col.attacl) a
    where col.attnum > 0 and not col.attisdropped
  ) x
  union all
  select '05_effective_privileges_not_row_authorization', to_jsonb(x) from (
    select r.schema_name, r.table_name, ar.rolname, ar.rolsuper, ar.rolbypassrls,
      pg_catalog.has_schema_privilege(ar.oid, r.schema_oid, 'USAGE') as schema_usage,
      pg_catalog.has_table_privilege(ar.oid, r.oid, 'SELECT') as select_table,
      pg_catalog.has_table_privilege(ar.oid, r.oid, 'INSERT') as insert_table,
      pg_catalog.has_table_privilege(ar.oid, r.oid, 'UPDATE') as update_table,
      pg_catalog.has_table_privilege(ar.oid, r.oid, 'DELETE') as delete_table,
      pg_catalog.has_table_privilege(ar.oid, r.oid, 'TRUNCATE') as truncate_table,
      pg_catalog.has_table_privilege(ar.oid, r.oid, 'REFERENCES') as references_table,
      pg_catalog.has_table_privilege(ar.oid, r.oid, 'TRIGGER') as trigger_table,
      pg_catalog.has_any_column_privilege(ar.oid, r.oid, 'INSERT') as insert_any_column,
      pg_catalog.has_any_column_privilege(ar.oid, r.oid, 'UPDATE') as update_any_column
    from relations r cross join api_roles ar where r.oid is not null
  ) x
  union all
  select '06_functions_definers_and_helpers', to_jsonb(x) from (
    select f.nspname as schema_name, f.proname,
      pg_catalog.pg_get_function_identity_arguments(f.oid) as arguments,
      pg_catalog.pg_get_userbyid(f.proowner) as owner, f.prosecdef as security_definer,
      f.proconfig as config_including_search_path,
      pg_catalog.pg_get_functiondef(f.oid) as definition,
      (select jsonb_agg(jsonb_build_object(
        'grantee', case when a.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee)::text end,
        'privilege', a.privilege_type, 'grantable', a.is_grantable))
        from pg_catalog.aclexplode(coalesce(f.proacl, pg_catalog.acldefault('f', f.proowner))) a) as grants,
      (select jsonb_agg(jsonb_build_object('role', ar.rolname,
        'execute', pg_catalog.has_function_privilege(ar.oid, f.oid, 'EXECUTE'),
        'schema_usage', pg_catalog.has_schema_privilege(ar.oid, f.pronamespace, 'USAGE')))
        from api_roles ar) as effective_execute
    from functions f
  ) x
  union all
  select '07_operational_triggers', to_jsonb(x) from (
    select schema_name, table_name, tgname, tgenabled,
      tgfoid::regprocedure::text as function_name,
      pg_catalog.pg_get_triggerdef(oid, true) as definition
    from triggers
  ) x
  union all
  select '08_schema_grants', to_jsonb(x) from (
    select n.nspname,
      case when a.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee)::text end as grantee,
      a.privilege_type, a.is_grantable
    from pg_catalog.pg_namespace n
    cross join lateral pg_catalog.aclexplode(coalesce(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a
    where n.nspname in ('public', 'private', 'storage')
  ) x
  union all
  select '09_role_memberships', to_jsonb(x) from (
    select pg_catalog.pg_get_userbyid(member) as member,
      pg_catalog.pg_get_userbyid(roleid) as granted_role, admin_option
    from pg_catalog.pg_auth_members
  ) x
  union all
  select '10_indexes', to_jsonb(x) from (
    select r.schema_name, r.table_name, i.indisunique, i.indisvalid,
      pg_catalog.pg_get_indexdef(i.indexrelid) as definition
    from pg_catalog.pg_index i join relations r on r.oid = i.indrelid
  ) x
  union all
  select '11_storage_bucket_visibility', to_jsonb(x) from (
    select id, name, public from storage.buckets
  ) x
  union all
  select '12_api_role_attributes', to_jsonb(ar) from api_roles ar
)
select secao, jsonb_agg(dado order by dado::text) as dados
from sections group by secao order by secao;
