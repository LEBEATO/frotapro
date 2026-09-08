import assert from 'node:assert/strict'
import test from 'node:test'
import { loadTypeScript } from './helpers/load-typescript.mjs'

const assignedVehicle = { id: 'official', current_branch_id: 'base-a', mileage: 100 }
const activeAssignment = { vehicle_id: 'official', branch_id: 'base-a' }

function dashboard({ assignment = activeAssignment, assignmentError = null,
  vehicle = assignedVehicle, vehicleError = null, branch = 'base-a' } = {}) {
  const states = []
  const calls = []
  let stateIndex = 0
  let load
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'driver', email: 'legacy@example.com' } }, error: null }) },
    from(table) {
      const call = { table, filters: [] }
      calls.push(call)
      const query = {
        select() { return query },
        eq(key, value) { call.filters.push([key, value]); return query },
        is(key, value) { call.filters.push([key, value]); return query },
        order() { return query }, limit() { return query },
        async maybeSingle() {
          if (table === 'profiles') return { data: { id: 'driver', active: true, branch_id: branch }, error: null }
          if (table === 'driver_vehicle_assignments') return { data: assignment, error: assignmentError }
          if (table === 'vehicles') {
            // Um fallback legado teria dados, tornando a regressão observável.
            const official = call.filters.some(([key, value]) => key === 'id' && value === 'official')
            return { data: official ? vehicle : { id: 'legacy' }, error: official ? vehicleError : null }
          }
          return { data: null, error: null }
        },
      }
      return query
    },
  }
  const jsx = (type, props) => ({ type, props })
  const page = loadTypeScript('src/app/(dashboard)/driver/page.tsx', {
    react: {
      useMemo: (fn) => fn(), useEffect() {},
      useCallback(fn) { load = fn; return fn },
      useState(initial) {
        const index = stateIndex++
        if (!(index in states)) states[index] = initial
        return [states[index], (value) => { states[index] = value }]
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': {}, 'lucide-react': {},
    '@/components/layout/AppShell': {}, '@/lib/supabase/client': { createClient: () => supabase },
  })
  function render() { stateIndex = 0; return JSON.stringify(page.default()) }
  render()
  return { states, calls, load: () => load(), render }
}

test('assignment válido consulta somente seu veículo e mantém histórico por motorista/veículo', async () => {
  const ctx = dashboard()
  await ctx.load()
  assert.equal(ctx.states[1].id, 'official')
  assert.equal(ctx.states[5], '')
  assert.deepEqual(ctx.calls.find((call) => call.table === 'driver_vehicle_assignments').filters,
    [['driver_id', 'driver'], ['ended_at', null]])
  assert.deepEqual(ctx.calls.filter((call) => call.table === 'vehicles').map((call) => call.filters), [[['id', 'official']]])
  for (const table of ['driver_checklists', 'fuel_records']) {
    assert.deepEqual(ctx.calls.find((call) => call.table === table).filters, [['user_id', 'driver'], ['vehicle_id', 'official']])
  }
})

test('sem assignment não consulta veículos legados nem histórico e apresenta estado vazio', async () => {
  const ctx = dashboard({ assignment: null })
  await ctx.load()
  assert.equal(ctx.states[1], null)
  assert.equal(ctx.states[2], null)
  assert.equal(ctx.states[3], null)
  assert.equal(ctx.states[5], '')
  assert.deepEqual(ctx.calls.map((call) => call.table), ['profiles', 'driver_vehicle_assignments'])
  assert.match(ctx.render(), /Nenhum veículo atribuído/)
})

for (const [name, options, vehicleQueries] of [
  ['erro da fonte oficial', { assignmentError: { message: 'network' } }, 0],
  ['múltiplos assignments', { assignment: null, assignmentError: { code: 'PGRST116' } }, 0],
  ['assignment sem veículo', { assignment: { ...activeAssignment, vehicle_id: null } }, 0],
  ['base do assignment divergente', { assignment: { ...activeAssignment, branch_id: 'base-b' } }, 0],
  ['perfil sem base', { branch: null }, 0],
  ['erro ao carregar veículo', { vehicleError: { message: 'network' } }, 1],
  ['veículo inexistente ou invisível por RLS', { vehicle: null }, 1],
  ['base do veículo divergente', { vehicle: { ...assignedVehicle, current_branch_id: 'base-b' } }, 1],
]) {
  test(`${name}: erro visível, sem fallback nem histórico`, async () => {
    const ctx = dashboard(options)
    await ctx.load()
    assert.ok(ctx.states[5])
    assert.equal(ctx.states[4], false)
    assert.equal(ctx.states[1], null)
    assert.equal(ctx.calls.filter((call) => call.table === 'vehicles').length, vehicleQueries)
    assert.ok(ctx.calls.every((call) => !['driver_checklists', 'fuel_records'].includes(call.table)))
    assert.match(ctx.render(), /Não foi possível carregar seu painel/)
    assert.doesNotMatch(ctx.render(), /Nenhum veículo atribuído/)
  })
}
