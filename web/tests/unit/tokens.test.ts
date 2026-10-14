import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { renderTokens, type TokenFiles } from '../../tools/tokens.mts'

const DIR = join(__dirname, '..', '..', '..', 'design', 'tokens')
const files: TokenFiles = Object.fromEntries(
  readdirSync(DIR)
    .filter(f => f.endsWith('.json') && f !== 'meta.json')
    .map(f => [f, JSON.parse(readFileSync(join(DIR, f), 'utf8'))]),
)
const { css, ts } = renderTokens(files)
const brand = JSON.parse(readFileSync(join(DIR, 'brand-tokens.json'), 'utf8')).brand

describe('design tokens', () => {
  test('every semantic colour role is emitted', () => {
    for (const [role, t] of Object.entries(files['color.light.json'])) {
      if ((t as { $type?: string }).$type === 'color') expect(css).toContain(`--${role}: oklch(`)
    }
  })

  test('the dark theme follows the system unless light is forced, and data-theme forces it', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {')
    expect(css).toContain(':root[data-theme="dark"] {')
  })

  test('aliases resolve to brand primitives', () => {
    expect(ts).toContain(`"primary": "${brand.color.primary.$value}"`)
    expect(ts).toContain(`"ring": "${brand.color.focus.$value}"`)
  })

  test('brand spacing is a linear scale of space-unit, so Tailwind --spacing reproduces it', () => {
    const unit = parseFloat(brand.spacing['1'].$value)
    for (const [step, t] of Object.entries<{ $value: string }>(brand.spacing)) {
      expect(parseFloat(t.$value)).toBe(Number(step) * unit)
    }
  })

  test('every motion verb emits a duration and an easing within the grammar', () => {
    for (const verb of ['reveal', 'bind', 'transfer', 'reflow', 'stamp', 'thread']) {
      const ms = css.match(new RegExp(`--motion-${verb}-duration: (\\d+)ms`))
      expect(ms, verb).not.toBeNull()
      expect(Number(ms![1])).toBeGreaterThanOrEqual(90)
      expect(Number(ms![1])).toBeLessThanOrEqual(340)
      expect(css).toContain(`--motion-${verb}-ease: cubic-bezier(`)
    }
  })

  test('comfortable density is the root default and every density is selectable', () => {
    expect(ts).toContain('export const densities = ["compact","comfortable","spacious"] as const')
    for (const d of ['compact', 'spacious']) expect(css).toContain(`[data-density="${d}"]`)
    expect(css.slice(0, css.indexOf('[data-density'))).toContain('--density-control-height:')
  })

  test('unknown aliases fail loudly', () => {
    const broken = { ...files, 'shape.json': { x: { $type: 'dimension', $value: '{brand.nope}' } } }
    expect(() => renderTokens(broken)).toThrow('unknown token alias {brand.nope}')
  })
})
