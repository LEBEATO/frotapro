-- Não aplicada automaticamente. Requer as unicidades ativas já existentes.
-- Índices duplicados ficam para revisão posterior. Sem alterações em policies.
begin;

create or replace function public.manage_driver_vehicle_assignment(
  p_driver_id uuid,
  p_operation text,
  p_vehicle_id text,
  p_expected_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor public.profiles%rowtype;
  driver public.profiles%rowtype;
  current_assignment public.driver_vehicle_assignments%rowtype;
  locked_assignment public.driver_vehicle_assignments%rowtype;
  target_vehicle public.vehicles%rowtype;
  old_vehicle public.vehicles%rowtype;
  new_assignment_id uuid;
  operation_time timestamptz := now();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Usuário não autenticado.';
  end if;
  if p_driver_id is null or p_operation is null
     or p_operation not in ('assign', 'replace', 'remove')
     or (p_operation = 'assign' and p_expected_assignment_id is not null)
     or (p_operation in ('replace', 'remove') and p_expected_assignment_id is null)
     or (p_operation = 'remove' and p_vehicle_id is not null)
     or (p_operation in ('assign', 'replace') and nullif(btrim(p_vehicle_id), '') is null) then
    raise exception using errcode = '22023', message = 'Parâmetros de associação inválidos.';
  end if;

  select p.* into actor from public.profiles p
   where p.id = actor_id for share;
  if not found or actor.active is not true or actor.role <> 'branch_manager'
     or actor.branch_id is null then
    raise exception using errcode = '42501', message = 'Apenas gestores de base ativos podem alterar associações.';
  end if;

  perform 1 from public.branches b
   where b.id = actor.branch_id and b.active = true for share;
  if not found then
    raise exception using errcode = '42501', message = 'A base do gestor não está ativa.';
  end if;

  -- Serializa também assign quando ainda não há linha de assignment para bloquear.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('driver_vehicle_assignment:' || p_driver_id::text, 0)
  );
  select p.* into driver from public.profiles p
   where p.id = p_driver_id for share;
  if not found or driver.active is not true or driver.role <> 'driver'
     or driver.branch_id is distinct from actor.branch_id then
    raise exception using errcode = '42501', message = 'Motorista ativo da sua base não encontrado.';
  end if;

  select a.* into current_assignment from public.driver_vehicle_assignments a
   where a.driver_id = p_driver_id and a.ended_at is null;
  if (p_operation = 'assign' and current_assignment.id is not null)
     or (p_operation in ('replace', 'remove')
         and current_assignment.id is distinct from p_expected_assignment_id) then
    raise exception using errcode = '40001', message = 'A associação mudou. Atualize os dados.';
  end if;
  if current_assignment.id is not null
     and current_assignment.branch_id is distinct from actor.branch_id then
    raise exception using errcode = '42501', message = 'A associação não pertence à sua base.';
  end if;
  if p_operation = 'replace' and current_assignment.vehicle_id = p_vehicle_id then
    raise exception using errcode = '22023', message = 'Este veículo já está atribuído ao motorista.';
  end if;

  -- Ordem determinística para operações que envolvem dois veículos.
  -- Veículos antes do assignment; NO KEY UPDATE é compatível com KEY SHARE
  -- dos fluxos existentes de checklist/combustível.
  perform v.id from public.vehicles v
   where v.id = current_assignment.vehicle_id or v.id = p_vehicle_id
   order by v.id for update;

  if current_assignment.id is not null then
    select v.* into old_vehicle from public.vehicles v
     where v.id = current_assignment.vehicle_id;
    if not found or old_vehicle.current_branch_id is distinct from actor.branch_id then
      raise exception using errcode = '42501', message = 'O veículo atual não pertence à sua base.';
    end if;
  end if;

  if p_operation in ('assign', 'replace') then
    select v.* into target_vehicle from public.vehicles v where v.id = p_vehicle_id;
    if not found or target_vehicle.current_branch_id is distinct from actor.branch_id then
      raise exception using errcode = '42501', message = 'Veículo de destino da sua base não encontrado.';
    end if;
    if target_vehicle.status::text is distinct from 'Ativo' then
      raise exception using errcode = '40001', message = 'O veículo de destino não está ativo.';
    end if;
    if exists (
      select 1 from public.driver_vehicle_assignments a
       where a.vehicle_id = p_vehicle_id and a.ended_at is null
    ) then
      raise exception using errcode = '40001', message = 'O veículo já possui uma associação ativa.';
    end if;
  end if;

  -- Revalida após esperar pelos veículos, inclusive contra alterações privilegiadas.
  select a.* into locked_assignment from public.driver_vehicle_assignments a
   where a.driver_id = p_driver_id and a.ended_at is null for no key update;
  if locked_assignment.id is distinct from current_assignment.id
     or locked_assignment.vehicle_id is distinct from current_assignment.vehicle_id
     or locked_assignment.branch_id is distinct from current_assignment.branch_id then
    raise exception using errcode = '40001', message = 'A associação mudou. Atualize os dados.';
  end if;
  if locked_assignment.id is not null then
    -- now() é o início da transação; uma chamada antiga deve tentar novamente.
    if locked_assignment.assigned_at > operation_time then
      raise exception using errcode = '40001', message = 'A associação é mais recente que a operação. Atualize os dados.';
    end if;
    update public.driver_vehicle_assignments
       set ended_at = operation_time
     where id = p_expected_assignment_id and driver_id = p_driver_id
       and branch_id = actor.branch_id and ended_at is null;
    if not found then
      raise exception using errcode = '40001', message = 'A associação mudou. Atualize os dados.';
    end if;
    -- Espelho derivado do assignment oficial, nunca critério de autorização.
    update public.vehicles set driver_id = null, updated_at = operation_time
     where id = locked_assignment.vehicle_id;
  end if;

  if p_operation in ('assign', 'replace') then
    insert into public.driver_vehicle_assignments (
      driver_id, vehicle_id, branch_id, assigned_by, assigned_at, ended_at
    ) values (
      p_driver_id, p_vehicle_id, actor.branch_id, actor_id, operation_time, null
    ) returning id into new_assignment_id;
    update public.vehicles set driver_id = p_driver_id, updated_at = operation_time
     where id = p_vehicle_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'operation', p_operation,
    'driver_id', p_driver_id,
    'ended_assignment_id', locked_assignment.id,
    'assignment_id', new_assignment_id,
    'previous_vehicle_id', locked_assignment.vehicle_id,
    'vehicle_id', p_vehicle_id,
    'operated_at', operation_time
  );
end;
$$;

alter function public.manage_driver_vehicle_assignment(uuid, text, text, uuid) owner to postgres;
revoke all on function public.manage_driver_vehicle_assignment(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.manage_driver_vehicle_assignment(uuid, text, text, uuid) to authenticated;

-- Único escritor da aplicação: a RPC acima. SELECT continua sujeito ao RLS.
-- Nenhum consumidor público de assignments foi encontrado em src/.
revoke all on public.driver_vehicle_assignments from anon;
revoke all on public.driver_vehicle_assignments from public;
revoke insert, update, delete, truncate on public.driver_vehicle_assignments from authenticated;
grant select on public.driver_vehicle_assignments to authenticated;
-- vehicles: nenhum grant/revoke. Nenhum índice ou policy é alterado.

commit;
