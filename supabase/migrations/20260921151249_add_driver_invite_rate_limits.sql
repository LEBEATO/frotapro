create table if not exists public.driver_invite_attempts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  provider_error text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists driver_invite_attempts_driver_time_idx
  on public.driver_invite_attempts (driver_id, requested_at desc);

create index if not exists driver_invite_attempts_branch_time_idx
  on public.driver_invite_attempts (branch_id, requested_at desc);

create index if not exists driver_invite_attempts_requested_by_idx
  on public.driver_invite_attempts (requested_by, requested_at desc);

alter table public.driver_invite_attempts enable row level security;

drop policy if exists driver_invite_attempts_select_manager
  on public.driver_invite_attempts;

create policy driver_invite_attempts_select_manager
  on public.driver_invite_attempts
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
            and viewer.branch_id = driver_invite_attempts.branch_id
          )
        )
    )
  );

revoke all on public.driver_invite_attempts from public, anon, authenticated;
grant select on public.driver_invite_attempts to authenticated;

create or replace function public.reserve_driver_invite_resend(
  p_driver_id uuid
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
  last_attempt_at timestamptz;
  first_attempt_at timestamptz;
  attempts_24h integer;
  wait_seconds integer;
  reservation_id uuid;
  operation_time timestamptz := now();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Usuário não autenticado.';
  end if;

  select p.* into actor
  from public.profiles p
  where p.id = actor_id;

  if not found
     or actor.active is not true
     or actor.role <> 'branch_manager'
     or actor.branch_id is null then
    raise exception using errcode = '42501', message = 'Acesso não autorizado.';
  end if;

  select p.* into driver
  from public.profiles p
  where p.id = p_driver_id
    and p.role = 'driver'
    and p.branch_id = actor.branch_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Motorista não encontrado nesta base.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('driver_invite:' || p_driver_id::text, 0)
  );

  select max(a.requested_at), min(a.requested_at), count(*)::integer
  into last_attempt_at, first_attempt_at, attempts_24h
  from public.driver_invite_attempts a
  where a.driver_id = p_driver_id
    and a.requested_at > operation_time - interval '24 hours';

  if last_attempt_at is not null
     and last_attempt_at > operation_time - interval '5 minutes' then
    wait_seconds := greatest(
      1,
      ceil(extract(epoch from (last_attempt_at + interval '5 minutes' - operation_time)))::integer
    );

    return pg_catalog.jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'retry_after_seconds', wait_seconds,
      'remaining_attempts', greatest(0, 3 - attempts_24h)
    );
  end if;

  if attempts_24h >= 3 then
    wait_seconds := greatest(
      1,
      ceil(extract(epoch from (first_attempt_at + interval '24 hours' - operation_time)))::integer
    );

    return pg_catalog.jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'retry_after_seconds', wait_seconds,
      'remaining_attempts', 0
    );
  end if;

  insert into public.driver_invite_attempts (
    driver_id,
    branch_id,
    requested_by,
    requested_at
  ) values (
    p_driver_id,
    actor.branch_id,
    actor_id,
    operation_time
  ) returning id into reservation_id;

  return pg_catalog.jsonb_build_object(
    'allowed', true,
    'reservation_id', reservation_id,
    'retry_after_seconds', 300,
    'remaining_attempts', greatest(0, 2 - attempts_24h)
  );
end;
$$;

alter function public.reserve_driver_invite_resend(uuid) owner to postgres;
revoke all on function public.reserve_driver_invite_resend(uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_driver_invite_resend(uuid)
  to authenticated;
