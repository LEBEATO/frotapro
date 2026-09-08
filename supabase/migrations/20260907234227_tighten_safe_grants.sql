-- S02: reduzir privilégios estruturais das roles da API.
-- Não altera SELECT / INSERT / UPDATE / DELETE.
-- Não altera RLS, policies, RPCs ou dados.
--
-- MAINTAIN é privilégio administrativo de manutenção da tabela.
-- TRUNCATE permite esvaziar a tabela.
-- REFERENCES permite criar referências/FKs.
-- TRIGGER permite criar triggers.
--
-- Nenhum desses privilégios é necessário para o funcionamento
-- normal do frontend do FrotaPro.

begin;

revoke maintain, truncate, references, trigger on table
  public.profiles,
  public.branches,
  public.vehicles,
  public.driver_vehicle_assignments,
  public.driver_checklists,
  public.fuel_records,
  public.maintenance_records,
  public.maintenance_releases
from public, anon, authenticated;

do $$
declare
  entry record;
begin

  -- REFERENCES também pode existir no nível individual das colunas.
  -- Por isso removemos esse privilégio coluna por coluna.
  for entry in
    select
      c.oid,
      c.relname,
      a.attname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n
      on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a
      on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relname in (
        'profiles',
        'branches',
        'vehicles',
        'driver_vehicle_assignments',
        'driver_checklists',
        'fuel_records',
        'maintenance_records',
        'maintenance_releases'
      )
      and a.attnum > 0
      and not a.attisdropped
  loop

    execute format(
      'revoke references (%I) on table public.%I from public, anon, authenticated',
      entry.attname,
      entry.relname
    );

  end loop;

  -- Verificação de segurança.
  --
  -- Depois dos REVOKEs acima, anon e authenticated não devem
  -- continuar recebendo MAINTAIN, TRUNCATE, REFERENCES ou TRIGGER
  -- por membership/herança de outra role.
  --
  -- Caso algum desses privilégios ainda exista, a migration gera
  -- uma exceção. Como estamos dentro de BEGIN/COMMIT, a transação
  -- será cancelada em vez de deixar uma alteração parcial.

  if exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n
      on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
    where n.nspname = 'public'
      and c.relname in (
        'profiles',
        'branches',
        'vehicles',
        'driver_vehicle_assignments',
        'driver_checklists',
        'fuel_records',
        'maintenance_records',
        'maintenance_releases'
      )
      and r.rolname in (
        'anon',
        'authenticated'
      )
      and (
        has_table_privilege(
          r.oid,
          c.oid,
          'MAINTAIN,TRUNCATE,REFERENCES,TRIGGER'
        )
        or has_any_column_privilege(
          r.oid,
          c.oid,
          'REFERENCES'
        )
      )
  ) then

    raise exception
      'Privilegios estruturais herdados permanecem. Revisar memberships antes de aplicar.';

  end if;

end;
$$;

commit;