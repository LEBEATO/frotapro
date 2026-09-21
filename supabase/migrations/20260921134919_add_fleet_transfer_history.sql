begin;

create table if not exists public.fleet_transfers (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('driver', 'vehicle')),
  driver_id uuid references public.profiles(id) on delete restrict,
  vehicle_id text references public.vehicles(id) on delete restrict,
  from_branch_id uuid not null references public.branches(id) on delete restrict,
  to_branch_id uuid not null references public.branches(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 5 and 500),
  transferred_by uuid not null references public.profiles(id) on delete restrict,
  transferred_at timestamptz not null default now(),
  constraint fleet_transfers_different_branches
    check (from_branch_id <> to_branch_id),
  constraint fleet_transfers_entity_matches_type
    check (
      (entity_type = 'driver' and driver_id is not null and vehicle_id is null)
      or
      (entity_type = 'vehicle' and vehicle_id is not null and driver_id is null)
    )
);

create index if not exists fleet_transfers_driver_history_idx
  on public.fleet_transfers (driver_id, transferred_at desc)
  where driver_id is not null;

create index if not exists fleet_transfers_vehicle_history_idx
  on public.fleet_transfers (vehicle_id, transferred_at desc)
  where vehicle_id is not null;

create index if not exists fleet_transfers_from_branch_idx
  on public.fleet_transfers (from_branch_id, transferred_at desc);

create index if not exists fleet_transfers_to_branch_idx
  on public.fleet_transfers (to_branch_id, transferred_at desc);

alter table public.fleet_transfers enable row level security;

drop policy if exists fleet_transfers_select_authorized
  on public.fleet_transfers;

create policy fleet_transfers_select_authorized
  on public.fleet_transfers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles viewer
      where viewer.id = (select auth.uid())
        and viewer.active = true
        and (
          viewer.role in ('admin', 'fleet_manager')
          or (
            viewer.role = 'branch_manager'
            and viewer.branch_id is not null
            and viewer.branch_id in (from_branch_id, to_branch_id)
          )
          or (
            viewer.role = 'driver'
            and driver_id = viewer.id
          )
        )
    )
  );

revoke all on public.fleet_transfers from public, anon, authenticated;
grant select on public.fleet_transfers to authenticated;

create or replace function public.transfer_fleet_entity(
  p_entity_type text,
  p_entity_id text,
  p_target_branch_id uuid,
  p_expected_branch_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor public.profiles%rowtype;
  target_branch public.branches%rowtype;
  driver public.profiles%rowtype;
  vehicle public.vehicles%rowtype;
  current_assignment public.driver_vehicle_assignments%rowtype;
  parsed_driver_id uuid;
  transfer_id uuid;
  source_branch_id uuid;
  operation_time timestamptz := now();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Usuário não autenticado.';
  end if;

  if p_entity_type not in ('driver', 'vehicle')
     or nullif(btrim(p_entity_id), '') is null
     or p_target_branch_id is null
     or p_expected_branch_id is null
     or char_length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
    raise exception using errcode = '22023', message = 'Parâmetros de transferência inválidos.';
  end if;

  select p.* into actor
  from public.profiles p
  where p.id = actor_id
  for share;

  if not found
     or actor.active is not true
     or actor.role not in ('admin', 'fleet_manager') then
    raise exception using errcode = '42501', message = 'Somente gestores globais ativos podem realizar transferências entre bases.';
  end if;

  select b.* into target_branch
  from public.branches b
  where b.id = p_target_branch_id
  for share;

  if not found or target_branch.active is not true then
    raise exception using errcode = '22023', message = 'A base de destino não existe ou está inativa.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'fleet_transfer:' || p_entity_type || ':' || p_entity_id,
      0
    )
  );

  if p_entity_type = 'driver' then
    begin
      parsed_driver_id := p_entity_id::uuid;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'Motorista inválido.';
    end;

    select p.* into driver
    from public.profiles p
    where p.id = parsed_driver_id
    for update;

    if not found or driver.role <> 'driver' or driver.active is not true then
      raise exception using errcode = 'P0002', message = 'Motorista ativo não encontrado.';
    end if;

    source_branch_id := driver.branch_id;

    if source_branch_id is null
       or source_branch_id is distinct from p_expected_branch_id then
      raise exception using errcode = '40001', message = 'A base do motorista mudou. Atualize os dados.';
    end if;

    if source_branch_id = p_target_branch_id then
      raise exception using errcode = '22023', message = 'O motorista já pertence à base de destino.';
    end if;

    select a.* into current_assignment
    from public.driver_vehicle_assignments a
    where a.driver_id = parsed_driver_id
      and a.ended_at is null
    for update;

    if current_assignment.id is not null then
      perform 1
      from public.vehicles v
      where v.id = current_assignment.vehicle_id
      for update;

      update public.driver_vehicle_assignments
      set ended_at = operation_time
      where id = current_assignment.id
        and ended_at is null;

      update public.vehicles
      set driver_id = null,
          updated_at = operation_time
      where id = current_assignment.vehicle_id;
    end if;

    update public.profiles
    set branch_id = p_target_branch_id,
        updated_at = operation_time
    where id = parsed_driver_id;

    insert into public.fleet_transfers (
      entity_type,
      driver_id,
      from_branch_id,
      to_branch_id,
      reason,
      transferred_by,
      transferred_at
    ) values (
      'driver',
      parsed_driver_id,
      source_branch_id,
      p_target_branch_id,
      btrim(p_reason),
      actor_id,
      operation_time
    ) returning id into transfer_id;
  else
    select v.* into vehicle
    from public.vehicles v
    where v.id = p_entity_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Veículo não encontrado.';
    end if;

    source_branch_id := vehicle.current_branch_id;

    if source_branch_id is null
       or source_branch_id is distinct from p_expected_branch_id then
      raise exception using errcode = '40001', message = 'A base do veículo mudou. Atualize os dados.';
    end if;

    if source_branch_id = p_target_branch_id then
      raise exception using errcode = '22023', message = 'O veículo já pertence à base de destino.';
    end if;

    select a.* into current_assignment
    from public.driver_vehicle_assignments a
    where a.vehicle_id = p_entity_id
      and a.ended_at is null
    for update;

    if current_assignment.id is not null then
      update public.driver_vehicle_assignments
      set ended_at = operation_time
      where id = current_assignment.id
        and ended_at is null;
    end if;

    update public.vehicles
    set current_branch_id = p_target_branch_id,
        driver_id = null,
        updated_at = operation_time
    where id = p_entity_id;

    insert into public.fleet_transfers (
      entity_type,
      vehicle_id,
      from_branch_id,
      to_branch_id,
      reason,
      transferred_by,
      transferred_at
    ) values (
      'vehicle',
      p_entity_id,
      source_branch_id,
      p_target_branch_id,
      btrim(p_reason),
      actor_id,
      operation_time
    ) returning id into transfer_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'id', transfer_id,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'from_branch_id', source_branch_id,
    'to_branch_id', p_target_branch_id,
    'transferred_by', actor_id,
    'transferred_at', operation_time
  );
end;
$$;

alter function public.transfer_fleet_entity(text, text, uuid, uuid, text)
  owner to postgres;

revoke all on function public.transfer_fleet_entity(text, text, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.transfer_fleet_entity(text, text, uuid, uuid, text)
  to authenticated;

commit;
