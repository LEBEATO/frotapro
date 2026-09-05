-- Proposta para revisão: segurança e integridade do abastecimento do motorista.
-- NÃO aplicada automaticamente ao Supabase.

begin;

alter table public.fuel_records enable row level security;

create schema if not exists private;

create or replace function public.normalize_driver_fuel_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_profile public.profiles%rowtype;
  active_assignment public.driver_vehicle_assignments%rowtype;
  assigned_vehicle public.vehicles%rowtype;
  calculated_distance integer;
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Usuário não autenticado.';
  end if;

  begin
    select profile.*
      into strict actor_profile
      from public.profiles as profile
     where profile.id = actor_id
       and profile.active = true;
  exception
    when no_data_found then
      raise exception using
        errcode = '42501',
        message = 'Perfil ativo não encontrado.';
  end;

  -- O fluxo administrativo continua protegido pelas policies existentes.
  if actor_profile.role in ('admin', 'fleet_manager', 'branch_manager') then
    return new;
  end if;

  if actor_profile.role <> 'driver' or actor_profile.branch_id is null then
    raise exception using
      errcode = '42501',
      message = 'Perfil sem permissão para registrar abastecimento.';
  end if;

  begin
    select assignment.*
      into strict active_assignment
      from public.driver_vehicle_assignments as assignment
     where assignment.driver_id = actor_id
       and assignment.ended_at is null
     for key share;
  exception
    when no_data_found then
      raise exception using
        errcode = '23514',
        message = 'Motorista não possui atribuição ativa de veículo.';
    when too_many_rows then
      raise exception using
        errcode = '23514',
        message = 'Motorista possui mais de uma atribuição ativa de veículo.';
  end;

  if active_assignment.branch_id is distinct from actor_profile.branch_id then
    raise exception using
      errcode = '23514',
      message = 'A atribuição ativa não pertence à base do motorista.';
  end if;

  begin
    select vehicle.*
      into strict assigned_vehicle
      from public.vehicles as vehicle
     where vehicle.id = active_assignment.vehicle_id
     for update;
  exception
    when no_data_found then
      raise exception using
        errcode = '23503',
        message = 'Veículo da atribuição ativa não encontrado.';
  end;

  if assigned_vehicle.current_branch_id is distinct from actor_profile.branch_id then
    raise exception using
      errcode = '23514',
      message = 'Veículo, motorista e atribuição pertencem a bases diferentes.';
  end if;

  if new.vehicle_id is not null
     and new.vehicle_id is distinct from active_assignment.vehicle_id then
    raise exception using
      errcode = '42501',
      message = 'O abastecimento só pode ser registrado para o veículo atualmente atribuído.';
  end if;

  if new.current_km is null
     or new.current_km < coalesce(assigned_vehicle.mileage, 0) then
    raise exception using
      errcode = '23514',
      message = 'A quilometragem do abastecimento não pode regredir.';
  end if;

  if new.liters is null or new.liters <= 0 then
    raise exception using
      errcode = '23514',
      message = 'A quantidade de litros deve ser maior que zero.';
  end if;

  if new.total_amount is null or new.total_amount <= 0 then
    raise exception using
      errcode = '23514',
      message = 'O valor total deve ser maior que zero.';
  end if;

  if nullif(btrim(new.fuel_type), '') is null
     or nullif(btrim(new.fuel_station), '') is null then
    raise exception using
      errcode = '23514',
      message = 'Combustível e posto são obrigatórios.';
  end if;

  calculated_distance := new.current_km - coalesce(assigned_vehicle.mileage, 0);

  new.user_id := actor_id;
  new.driver_id := actor_id;
  new.branch_id := actor_profile.branch_id;
  new.vehicle_id := active_assignment.vehicle_id;
  new.driver := actor_profile.full_name;
  new.driver_email := actor_profile.email;
  new.vehicle_model := assigned_vehicle.model;
  new.vehicle_plate := assigned_vehicle.plate;
  new.previous_km := coalesce(assigned_vehicle.mileage, 0);
  new.distance_km := calculated_distance;
  new.price_per_liter := round(new.total_amount / new.liters, 3);
  new.km_per_liter := case
    when calculated_distance > 0
      then round(calculated_distance::numeric / new.liters, 3)
    else null
  end;
  new.cost_per_km := case
    when calculated_distance > 0
      then round(new.total_amount / calculated_distance, 3)
    else null
  end;
  new.submitted_at := coalesce(new.submitted_at, now());
  new.updated_at := now();

  return new;
end;
$$;

revoke all on function public.normalize_driver_fuel_identity() from public;
revoke all on function public.normalize_driver_fuel_identity() from anon;
revoke all on function public.normalize_driver_fuel_identity() from authenticated;

drop trigger if exists normalize_driver_fuel_identity
  on public.fuel_records;

create trigger normalize_driver_fuel_identity
before insert on public.fuel_records
for each row
execute function public.normalize_driver_fuel_identity();

create or replace function private.authorize_fuel_insert(
  requested_user_id uuid,
  requested_driver_id uuid,
  requested_branch_id uuid,
  requested_vehicle_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_profile public.profiles%rowtype;
begin
  if actor_id is null then
    return false;
  end if;

  select profile.*
    into actor_profile
    from public.profiles as profile
   where profile.id = actor_id
     and profile.active = true;

  if not found then
    return false;
  end if;

  if actor_profile.role in ('admin', 'fleet_manager') then
    return true;
  end if;

  if actor_profile.role = 'branch_manager' then
    return actor_profile.branch_id is not null
       and requested_branch_id = actor_profile.branch_id;
  end if;

  if actor_profile.role <> 'driver'
     or actor_profile.branch_id is null
     or requested_user_id is distinct from actor_id
     or requested_driver_id is distinct from actor_id
     or requested_branch_id is distinct from actor_profile.branch_id then
    return false;
  end if;

  return exists (
    select 1
      from public.driver_vehicle_assignments as assignment
      join public.vehicles as vehicle
        on vehicle.id = assignment.vehicle_id
     where assignment.driver_id = actor_id
       and assignment.vehicle_id = requested_vehicle_id
       and assignment.branch_id = requested_branch_id
       and assignment.ended_at is null
       and vehicle.current_branch_id = requested_branch_id
  );
end;
$$;

revoke all on function private.authorize_fuel_insert(uuid, uuid, uuid, text)
  from public;
revoke all on function private.authorize_fuel_insert(uuid, uuid, uuid, text)
  from anon;
revoke all on function private.authorize_fuel_insert(uuid, uuid, uuid, text)
  from authenticated;

grant usage on schema private to authenticated;
grant execute on function private.authorize_fuel_insert(uuid, uuid, uuid, text)
  to authenticated;

drop policy if exists fuel_driver_assignment_restriction
  on public.fuel_records;

create policy fuel_driver_assignment_restriction
on public.fuel_records
as restrictive
for insert
to authenticated
with check (
  private.authorize_fuel_insert(
    user_id,
    driver_id,
    branch_id,
    vehicle_id
  )
);

create or replace function public.sync_vehicle_from_fuel_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.vehicles
     set mileage = new.current_km,
         updated_at = now()
   where id = new.vehicle_id
     and current_branch_id = new.branch_id
     and coalesce(mileage, 0) <= new.current_km;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'Não foi possível sincronizar a quilometragem do veículo.';
  end if;

  return new;
end;
$$;

revoke all on function public.sync_vehicle_from_fuel_record() from public;
revoke all on function public.sync_vehicle_from_fuel_record() from anon;
revoke all on function public.sync_vehicle_from_fuel_record() from authenticated;

drop trigger if exists trg_sync_vehicle_from_fuel_record
  on public.fuel_records;

create trigger trg_sync_vehicle_from_fuel_record
after insert on public.fuel_records
for each row
execute function public.sync_vehicle_from_fuel_record();

commit;
