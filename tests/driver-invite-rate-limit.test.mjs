import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../supabase/migrations/20260921151249_add_driver_invite_rate_limits.sql',
  import.meta.url
)

test('reenvio de convite possui limite atômico e histórico protegido', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /create table if not exists public\.driver_invite_attempts/i)
  assert.match(sql, /enable row level security/i)
  assert.match(sql, /pg_advisory_xact_lock/i)
  assert.match(sql, /interval '5 minutes'/i)
  assert.match(sql, /interval '24 hours'/i)
  assert.match(sql, /attempts_24h >= 3/i)
  assert.match(sql, /revoke all on public\.driver_invite_attempts from public, anon, authenticated/i)
})

test('API responde rate limit com Retry-After e registra o resultado', async () => {
  const route = await readFile(
    new URL('../src/app/api/manager/drivers/[id]/resend-invite/route.ts', import.meta.url),
    'utf8'
  )

  assert.match(route, /reserve_driver_invite_resend/)
  assert.match(route, /status: 429/)
  assert.match(route, /'Retry-After'/)
  assert.match(route, /status: 'sent'/)
  assert.match(route, /status: 'failed'/)
})
