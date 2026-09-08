import assert from 'node:assert/strict'
import test from 'node:test'
import { loadTypeScript } from './helpers/load-typescript.mjs'

const helper = loadTypeScript('src/lib/internal-redirect.ts')
const origin = 'https://frotapro.example'
const invalid = [null, '', '//evil.example', '/\\evil.example', '/\\/evil.example',
  'https://evil.example', 'https://frotapro.example/driver', 'javascript:alert(1)',
  'driver', ' //evil.example', '/\t/evil.example', '/\n/evil.example',
  '/%2fevil.example', '/%5cevil.example', '/%252fevil.example', '/%00foo',
  '/a/..//evil.example', '/%2e%2e//evil.example']

test('redirects rejeitam origens externas e caminhos ambíguos', () => {
  for (const next of invalid) {
    assert.equal(helper.internalRedirect(next, origin, '/login').href, `${origin}/login`, String(next))
  }
})

test('redirects preservam caminhos, recuperação, convite, query e hash internos', () => {
  for (const next of ['/driver', '/reset-password', '/auth/accept-invite', '/',
    '/driver?tab=fuel#ultimo', '/manager?url=https%3A%2F%2Fexample.com', '/base/S%C3%A3o%20Geraldo']) {
    assert.equal(helper.internalRedirect(next, origin, '/login').href, `${origin}${next}`)
  }
  assert.equal(helper.internalRedirect('/a/../driver', origin, '/login').pathname, '/driver')
})

function route(kind, authError = null) {
  const calls = []
  const auth = {
    async exchangeCodeForSession(code) { calls.push(code); return { error: authError } },
    async verifyOtp(value) { calls.push(value); return { error: authError } },
  }
  const routeModule = loadTypeScript(`src/app/(auth)/auth/${kind}/route.ts`, {
    '@/lib/internal-redirect': helper,
    'next/server': { NextResponse: { redirect: (url) => url } },
    'next/headers': { cookies: async () => ({ getAll: () => [], set() {} }) },
    '@supabase/ssr': { createServerClient: () => ({ auth }) },
    '@/lib/supabase/server': { createServerClientWithCookies: async () => ({ auth }) },
  })
  return { calls, get: (params) => routeModule.GET({ url: `${origin}/auth/${kind}?${new URLSearchParams(params)}` }) }
}

for (const kind of ['callback', 'confirm']) {
  test(`${kind}: destinos maliciosos não escapam após autenticação`, async () => {
    for (const next of invalid.filter((value) => value !== null)) {
      const { get, calls } = route(kind)
      const result = await get({ code: 'code', token_hash: 'token', type: 'invite', next })
      assert.equal(result.origin, origin)
      assert.equal(result.pathname, kind === 'callback' ? '/login' : '/auth/accept-invite')
      assert.equal(calls.length, 1)
    }
  })

  test(`${kind}: sucesso preserva destino interno`, async () => {
    const { get } = route(kind)
    const result = await get({ code: 'code', token_hash: 'token', type: 'recovery', next: '/reset-password?flow=recovery#senha' })
    assert.equal(result.pathname, '/reset-password')
    assert.equal(result.searchParams.get('flow'), 'recovery')
    assert.equal(result.hash, '#senha')
    assert.equal(result.searchParams.has('token_hash'), false)
    assert.equal(result.searchParams.has('type'), false)
    assert.equal(result.searchParams.has('next'), false)
  })

  test(`${kind}: credencial ausente ou inválida retorna login`, async () => {
    const missing = route(kind)
    assert.equal((await missing.get({ next: '/driver' })).pathname, '/login')
    assert.equal(missing.calls.length, 0)
    const failed = route(kind, { message: 'expired' })
    const result = await failed.get({ code: 'bad', token_hash: 'bad', type: 'invite', next: '/driver' })
    assert.equal(result.origin, origin)
    assert.equal(result.pathname, '/login')
    assert.ok(result.searchParams.get('error'))
  })
}
