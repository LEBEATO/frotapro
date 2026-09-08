-- S05: proposed correction; NOT applied. Review the live definition before deployment.
-- Requires the schema from 20260905120000_review_maintenance_release_flow.sql.
-- Only the action guard changes; authorization, locks, writes and grants are preserved.

begin;

create or replace function public.transition_maintenance_record(
  p_maintenance_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_profile public.profiles%rowtype;
  maintenance public.maintenance_records%rowtype;
  vehicle public.vehicles%rowtype;
  has_other_open_maintenance boolean := false;
  release_observation text;
  release_driver text;
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Usuário não autenticado.';
  end if;

  if p_action is null or p_action not in ('start', 'complete_and_release') then
    raise exception using
      errcode = '22023',
      message = 'Ação de manutenção inválida.';
  end if;

  begin
    select profile.*
      into strict actor_profile
      from public.profiles as profile
     where profile.id = actor_id
     for key share;
  exception
    when no_data_found then
      raise exception using
        errcode = '42501',
        message = 'Perfil do usuário não encontrado.';
  end;

  if actor_profile.active is false then
    raise exception using
      errcode = '42501',
      message = 'Perfil do usuário está inativo.';
  end if;

  if actor_profile.role not in ('admin', 'fleet_manager', 'branch_manager') then
    raise exception using
      errcode = '42501',
      message = 'Usuário não autorizado para alterar manutenção.';
  end if;

  if actor_profile.role = 'branch_manager'
     and actor_profile.branch_id is null then
    raise exception using
      errcode = '42501',
      message = 'Gestor de base sem base vinculada.';
  end if;

  begin
    select record.*
      into strict maintenance
      from public.maintenance_records as record
     where record.id = p_maintenance_id
     for update;
  exception
    when no_data_found then
      raise exception using
        errcode = 'P0002',
        message = 'Manutenção não encontrada.';
  end;

  if actor_profile.role = 'branch_manager'
     and maintenance.branch_id is distinct from actor_profile.branch_id then
    raise exception using
      errcode = '42501',
      message = 'Manutenção não pertence à base do gestor.';
  end if;

  if maintenance.status = 'cancelled' then
    raise exception using
      errcode = '23514',
      message = 'Manutenção cancelada não pode ser iniciada ou concluída.';
  end if;

  if p_action = 'start' then
    if maintenance.status = 'in_progress' then
      return jsonb_build_object(
        'success', true,
        'message', 'Manutenção já está em andamento.',
        'status', 'in_progress'
      );
    end if;

    if maintenance.status is distinct from 'pending'::public.maintenance_status then
      raise exception using
        errcode = '23514',
        message = 'Somente manutenções pendentes podem ser iniciadas.';
    end if;

    update public.maintenance_records
       set status = 'in_progress'::public.maintenance_status,
           updated_at = now()
     where id = maintenance.id;

    return jsonb_build_object(
      'success', true,
      'message', 'Manutenção marcada como em andamento.',
      'status', 'in_progress'
    );
  end if;

  if maintenance.status is distinct from 'in_progress'::public.maintenance_status then
    raise exception using
      errcode = '23514',
      message = 'A manutenção precisa estar em andamento antes da liberação.';
  end if;

  if maintenance.completed_at is not null then
    raise exception using
      errcode = '23514',
      message = 'Esta manutenção já foi concluída.';
  end if;

  if exists (
    select 1
      from public.maintenance_releases as release
     where release.maintenance_record_id = maintenance.id
  ) then
    raise exception using
      errcode = '23505',
      message = 'Esta manutenção já possui liberação registrada.';
  end if;

  if maintenance.vehicle_id is null then
    raise exception using
      errcode = '23514',
      message = 'Manutenção sem veículo vinculado não pode ser liberada automaticamente.';
  end if;

  begin
    select current_vehicle.*
      into strict vehicle
      from public.vehicles as current_vehicle
     where current_vehicle.id = maintenance.vehicle_id
     for update;
  exception
    when no_data_found then
      raise exception using
        errcode = 'P0002',
        message = 'Veículo da manutenção não encontrado.';
  end;

  if actor_profile.role = 'branch_manager'
     and vehicle.current_branch_id is distinct from actor_profile.branch_id then
    raise exception using
      errcode = '42501',
      message = 'Veículo não pertence à base do gestor.';
  end if;

  select coalesce(
           nullif(btrim(opened_profile.full_name), ''),
           nullif(btrim(opened_profile.email), '')
         )
    into release_driver
    from public.profiles as opened_profile
   where opened_profile.id = maintenance.opened_by;

  release_driver := coalesce(
    release_driver,
    nullif(btrim(actor_profile.full_name), ''),
    nullif(btrim(actor_profile.email), ''),
    'Não informado'
  );

  update public.maintenance_records
     set status = 'completed'::public.maintenance_status,
         completed_at = now(),
         completed_by = actor_id,
         updated_at = now()
   where id = maintenance.id;

  select exists (
    select 1
      from public.maintenance_records as other_record
     where other_record.vehicle_id = maintenance.vehicle_id
       and other_record.id <> maintenance.id
       and other_record.status in (
         'pending'::public.maintenance_status,
         'in_progress'::public.maintenance_status
       )
  )
    into has_other_open_maintenance;

  release_observation :=
    case
      when has_other_open_maintenance then
        'Manutenção concluída, mas veículo mantido em manutenção por existir outra pendência aberta.'
      else
        'Manutenção concluída e veículo liberado para operação.'
    end;

  insert into public.maintenance_releases (
    id,
    vehicle_id,
    driver,
    vehicle_model,
    vehicle_plate,
    previous_status,
    maintenance_issue,
    manager_observation,
    released_at,
    released_by,
    branch_id,
    maintenance_record_id,
    updated_at
  ) values (
    extensions.gen_random_uuid()::text,
    vehicle.id,
    release_driver,
    vehicle.model,
    vehicle.plate,
    vehicle.status::text,
    coalesce(
      nullif(btrim(maintenance.service_description), ''),
      nullif(btrim(maintenance.notes), ''),
      vehicle.issues
    ),
    release_observation,
    now(),
    actor_id,
    maintenance.branch_id,
    maintenance.id,
    now()
  );

  if not has_other_open_maintenance then
    update public.vehicles
       set status = 'Ativo'::public.vehicle_status,
           issues = null,
           updated_at = now()
     where id = vehicle.id;
  end if;

  return jsonb_build_object(
    'success', true,
    'message',
      case
        when has_other_open_maintenance then
          'Manutenção concluída e liberação registrada. O veículo permanece em manutenção por outra pendência aberta.'
        else
          format('Manutenção concluída. O veículo %s voltou para Ativo.', vehicle.plate)
      end,
    'status', 'completed',
    'vehicle_released', not has_other_open_maintenance
  );
end;
$$;

revoke all on function public.transition_maintenance_record(uuid, text) from public;
revoke all on function public.transition_maintenance_record(uuid, text) from anon;
revoke all on function public.transition_maintenance_record(uuid, text) from authenticated;

grant execute on function public.transition_maintenance_record(uuid, text) to authenticated;

commit;
