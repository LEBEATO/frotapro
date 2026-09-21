import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const componentUrl = new URL(
  '../src/components/motion/DashboardMotion.tsx',
  import.meta.url
)

test('animação do dashboard usa escopo, cleanup e redução de movimento', async () => {
  const source = await readFile(componentUrl, 'utf8')

  assert.match(source, /useGSAP/)
  assert.match(source, /scope: containerRef/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /media\.revert\(\)/)
  assert.match(source, /autoAlpha/)
  assert.doesNotMatch(source, /^\s*(?:width|height|top|left):/m)
})

test('dashboards marcam cabeçalho, cards e painéis para animação', async () => {
  const [admin, manager] = await Promise.all([
    readFile(new URL('../src/app/(dashboard)/admin/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/(dashboard)/manager/page.tsx', import.meta.url), 'utf8'),
  ])

  for (const source of [admin, manager]) {
    assert.match(source, /<DashboardMotion>/)
    assert.match(source, /data-motion-header/)
    assert.match(source, /data-motion-card/)
    assert.match(source, /data-motion-panel/)
  }
})
