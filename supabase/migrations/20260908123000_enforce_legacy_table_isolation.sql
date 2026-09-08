-- S02: isolamento definitivo das tabelas legadas.
-- Não remove tabelas.
-- Não remove dados.
-- Não altera tabelas operacionais atuais.

begin;

-- --------------------------------------------------
-- driver_assignments
-- --------------------------------------------------

alter table public.driver_assignments
  enable row level security;

drop policy if exists "Allow select for authenticated"
  on public.driver_assignments;

drop policy if exists "Allow upsert for authenticated"
  on public.driver_assignments;

drop policy if exists legacy_deny_application
  on public.driver_assignments;

revoke all privileges
  on table public.driver_assignments
  from public, anon, authenticated;

-- Remove também privilégios REFERENCES concedidos por coluna.
do $$
declare
  column_name text;
begin
  for column_name in
    select a.attname
    from pg_catalog.pg_attribute a
    where a.attrelid = 'public.driver_assignments'::regclass
      and a.attnum > 0
      and not a.attisdropped
  loop
    execute format(
      'revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I)
       on table public.driver_assignments
       from public, anon, authenticated',
      column_name
    );
  end loop;
end;
$$;

create policy legacy_deny_application
on public.driver_assignments
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

-- --------------------------------------------------
-- motoristas
-- --------------------------------------------------

alter table public.motoristas
  enable row level security;

drop policy if exists "Motoristas podem ver seu próprio perfil"
  on public.motoristas;

drop policy if exists legacy_deny_application
  on public.motoristas;

revoke all privileges
  on table public.motoristas
  from public, anon, authenticated;

do $$
declare
  column_name text;
begin
  for column_name in
    select a.attname
    from pg_catalog.pg_attribute a
    where a.attrelid = 'public.motoristas'::regclass
      and a.attnum > 0
      and not a.attisdropped
  loop
    execute format(
      'revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I)
       on table public.motoristas
       from public, anon, authenticated',
      column_name
    );
  end loop;
end;
$$;

create policy legacy_deny_application
on public.motoristas
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

-- --------------------------------------------------
-- Verificação final
-- --------------------------------------------------

do $$
begin
  if has_table_privilege(
    'anon',
    'public.driver_assignments',
    'SELECT'
  )
  or has_table_privilege(
    'authenticated',
    'public.driver_assignments',
    'SELECT'
  )
  or has_table_privilege(
    'anon',
    'public.motoristas',
    'SELECT'
  )
  or has_table_privilege(
    'authenticated',
    'public.motoristas',
    'SELECT'
  ) then
    raise exception
      'Falha ao isolar tabelas legadas: SELECT ainda está disponível.';
  end if;
end;
$$;

commit;