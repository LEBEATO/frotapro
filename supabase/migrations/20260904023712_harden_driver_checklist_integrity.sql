-- CORREÇÃO 1: segurança e integridade do checklist do motorista.
-- Esta migration não limita a quantidade de checklists por dia.

begin;

alter table public.maintenance_records
  add column if not exists source_checklist_id text;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_constraint
     where conname = 'maintenance_records_source_checklist_id_fkey'
       and conrelid = 'public.maintenance_records'::regclass
  ) then
    alter table public.maintenance_records
      add constraint maintenance_records_source_checklist_id_fkey
      foreign key (source_checklist_id)
      references public.driver_checklists (id);
  end if;

  if not exists (
    select 1
      from pg_catalog.pg_constraint
     where conname = 'maintenance_records_source_checklist_id_key'
       and conrelid = 'public.maintenance_records'::regclass
  ) then
    alter table public.maintenance_records
      add constraint maintenance_records_source_checklist_id_key
      unique (source_checklist_id);
  end if;
end;
$$;

create or replace function public.normalize_driver_checklist_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  driver_profile public.profiles%rowtype;
  active_assignment public.driver_vehicle_assignments%rowtype;
  assigned_vehicle public.vehicles%rowtype;
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Usuário não autenticado.';
  end if;

  begin
    select profile.*
      into strict driver_profile
      from public.profiles as profile
     where profile.id = actor_id
       and profile.active = true
       and profile.role = 'driver'
       and profile.branch_id is not null;
  exception
    when no_data_found then
      raise exception using
        errcode = '42501',
        message = 'Perfil de motorista ativo e com base válida não encontrado.';
  end;

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

  if active_assignment.branch_id is distinct from driver_profile.branch_id then
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

  if assigned_vehicle.current_branch_id is distinct from driver_profile.branch_id then
    raise exception using
      errcode = '23514',
      message = 'Veículo, motorista e atribuição pertencem a bases diferentes.';
  end if;

  if new.vehicle_id is not null
     and new.vehicle_id is distinct from active_assignment.vehicle_id then
    raise exception using
      errcode = '42501',
      message = 'O checklist só pode ser enviado para o veículo atualmente atribuído.';
  end if;

  if new.km_atual is null or new.km_atual < 0 then
    raise exception using
      errcode = '23514',
      message = 'A quilometragem do checklist é obrigatória e não pode ser negativa.';
  end if;

  if new.km_atual < coalesce(assigned_vehicle.mileage, 0) then
    raise exception using
      errcode = '23514',
      message = format(
        'A quilometragem informada (%s) não pode ser menor que a atual do veículo (%s).',
        new.km_atual,
        coalesce(assigned_vehicle.mileage, 0)
      );
  end if;

  new.user_id := actor_id;
  new.driver_id := actor_id;
  new.branch_id := driver_profile.branch_id;
  new.vehicle_id := active_assignment.vehicle_id;
  new.driver := driver_profile.full_name;
  new.driver_email := driver_profile.email;
  new.vehicle_model := assigned_vehicle.model;
  new.vehicle_plate := assigned_vehicle.plate;
  new.checklist_date := current_date;

  return new;
end;
$$;

revoke all on function public.normalize_driver_checklist_identity() from public;
revoke all on function public.normalize_driver_checklist_identity() from anon;
revoke all on function public.normalize_driver_checklist_identity() from authenticated;

drop trigger if exists normalize_driver_checklist_identity
  on public.driver_checklists;

create trigger normalize_driver_checklist_identity
before insert on public.driver_checklists
for each row
execute function public.normalize_driver_checklist_identity();

drop policy if exists driver_checklists_driver_insert_guard
  on public.driver_checklists;

drop policy if exists driver_checklists_insert_driver
  on public.driver_checklists;

create policy driver_checklists_driver_insert_guard
on public.driver_checklists
as permissive
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and driver_id = (select auth.uid())
  and exists (
    select 1
      from public.profiles as profile
     where profile.id = (select auth.uid())
       and profile.active = true
       and profile.role = 'driver'
       and profile.branch_id = driver_checklists.branch_id
  )
  and exists (
    select 1
      from public.driver_vehicle_assignments as assignment
      join public.vehicles as vehicle
        on vehicle.id = assignment.vehicle_id
     where assignment.driver_id = (select auth.uid())
       and assignment.vehicle_id = driver_checklists.vehicle_id
       and assignment.ended_at is null
       and assignment.branch_id = driver_checklists.branch_id
       and vehicle.current_branch_id = driver_checklists.branch_id
  )
);

create or replace function public.sync_vehicle_from_checklist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  driver_profile public.profiles%rowtype;
  active_assignment public.driver_vehicle_assignments%rowtype;
  assigned_vehicle public.vehicles%rowtype;
  issue_description text;
begin
  if new.user_id is null
     or new.driver_id is null
     or new.user_id is distinct from new.driver_id then
    raise exception using
      errcode = '42501',
      message = 'Identidade inválida no checklist.';
  end if;

  begin
    select profile.*
      into strict driver_profile
      from public.profiles as profile
     where profile.id = new.driver_id
       and profile.active = true
       and profile.role = 'driver'
       and profile.branch_id = new.branch_id;
  exception
    when no_data_found then
      raise exception using
        errcode = '42501',
        message = 'Motorista do checklist não está ativo ou não pertence à base informada.';
  end;

  begin
    select assignment.*
      into strict active_assignment
      from public.driver_vehicle_assignments as assignment
     where assignment.driver_id = new.driver_id
       and assignment.vehicle_id = new.vehicle_id
       and assignment.branch_id = new.branch_id
       and assignment.ended_at is null
     for key share;
  exception
    when no_data_found then
      raise exception using
        errcode = '23514',
        message = 'Atribuição ativa incompatível com o checklist.';
    when too_many_rows then
      raise exception using
        errcode = '23514',
        message = 'Há atribuições ativas duplicadas para este checklist.';
  end;

  begin
    select vehicle.*
      into strict assigned_vehicle
      from public.vehicles as vehicle
     where vehicle.id = new.vehicle_id
       and vehicle.current_branch_id = new.branch_id
     for update;
  exception
    when no_data_found then
      raise exception using
        errcode = '23514',
        message = 'Veículo do checklist não pertence à base informada.';
  end;

  if new.km_atual is null
     or new.km_atual < coalesce(assigned_vehicle.mileage, 0) then
    raise exception using
      errcode = '23514',
      message = 'A quilometragem do checklist não pode regredir.';
  end if;

  update public.vehicles
     set mileage = new.km_atual,
         updated_at = now()
   where id = new.vehicle_id;

  if new.has_issue then
    issue_description := coalesce(
      nullif(btrim(new.observation), ''),
      'Ocorrência identificada no checklist diário.'
    );

    update public.vehicles
       set status = 'Manutenção'::public.vehicle_status,
           issues = issue_description,
           updated_at = now()
     where id = new.vehicle_id;

    insert into public.maintenance_records (
      vehicle_id,
      vehicle_plate,
      branch_id,
      opened_by,
      mechanic_name,
      service_description,
      maintenance_type,
      mileage,
      status,
      notes,
      started_at,
      source_checklist_id
    ) values (
      new.vehicle_id,
      new.vehicle_plate,
      new.branch_id,
      new.driver_id,
      'Não atribuído',
      issue_description,
      'Checklist diário',
      new.km_atual,
      'pending'::public.maintenance_status,
      issue_description,
      coalesce(new.submitted_at, now()),
      new.id
    )
    on conflict (source_checklist_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_vehicle_from_checklist() from public;
revoke all on function public.sync_vehicle_from_checklist() from anon;
revoke all on function public.sync_vehicle_from_checklist() from authenticated;

commit;
