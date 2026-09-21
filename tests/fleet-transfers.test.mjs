import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../supabase/migrations/20260921134919_add_fleet_transfer_history.sql',
  import.meta.url
)

async function migrationSql() {
  return readFile(migrationUrl, 'utf8')
}

const actorIndexMigrationUrl = new URL(
  '../supabase/migrations/20260921143008_add_fleet_transfer_actor_index.sql',
  import.meta.url
)

test('transferências possuem histórico, RLS e escrita somente pela RPC', async () => {
  const sql = await migrationSql()

  assert.match(sql, /create table if not exists public\.fleet_transfers/i)
  assert.match(sql, /alter table public\.fleet_transfers enable row level security/i)
  assert.match(sql, /revoke all on public\.fleet_transfers from public, anon, authenticated/i)
  assert.match(sql, /grant select on public\.fleet_transfers to authenticated/i)
  assert.match(sql, /create or replace function public\.transfer_fleet_entity/i)
  assert.match(sql, /security definer/i)
  assert.match(sql, /set search_path = ''/i)
  assert.match(sql, /actor\.role not in \('admin', 'fleet_manager'\)/i)
  assert.match(sql, /grant execute on function public\.transfer_fleet_entity[\s\S]+to authenticated/i)
})

test('transferência encerra associação ativa e preserva rastreabilidade', async () => {
  const sql = await migrationSql()

  assert.match(sql, /update public\.driver_vehicle_assignments[\s\S]+set ended_at = operation_time/i)
  assert.match(sql, /insert into public\.fleet_transfers/i)
  assert.match(sql, /from_branch_id/i)
  assert.match(sql, /to_branch_id/i)
  assert.match(sql, /transferred_by/i)
  assert.match(sql, /p_expected_branch_id/i)
  assert.match(sql, /pg_advisory_xact_lock/i)
})

test('histórico indexa o usuário responsável', async () => {
  const sql = await readFile(actorIndexMigrationUrl, 'utf8')

  assert.match(sql, /fleet_transfers_transferred_by_idx/i)
  assert.match(sql, /\(transferred_by, transferred_at desc\)/i)
})
