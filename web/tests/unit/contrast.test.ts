import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, wcagContrast } from 'culori'
import { describe, expect, test } from 'vitest'
import { colorHex, colorHexDark } from '@/lib/design/tokens.generated'

type Palette = Record<string, string>
const themes: [string, Palette][] = [['light', colorHex], ['dark', colorHexDark]]
const globals = readFileSync(join(__dirname, '..', '..', 'app', 'globals.css'), 'utf8')

// Text pairs need 4.5:1 (WCAG 1.4.3); control boundaries and focus need 3:1 (1.4.11).
const TEXT: [string, string][] = [
  ['foreground', 'background'], ['foreground', 'surface'], ['foreground', 'sunken'], ['foreground', 'well'],
  ['muted', 'background'], ['muted', 'surface'], ['muted', 'sunken'], ['muted', 'well'],
  ['primary', 'background'], ['primary', 'surface'], ['primary', 'primary-soft'],
  ['primary-foreground', 'primary'], ['primary-foreground', 'primary-hover'], ['foreground', 'primary-soft'],
  ['signal-foreground', 'signal'], ['signal-foreground', 'signal-hover'], ['signal-stamp-foreground', 'signal-stamp'], ['foreground', 'signal-soft'],
  ['inverse-foreground', 'inverse'], ['inverse-muted', 'inverse'],
  ['chrome-foreground', 'chrome'], ['chrome-muted', 'chrome'], ['brand-foreground', 'brand'],
  ...['neutral', 'info', 'success', 'warning', 'danger'].flatMap((t): [string, string][] => [[`tone-${t}`, `tone-${t}-bg`], [`tone-${t}`, 'surface']]),
  ['primary-foreground', 'tone-danger'],
]
const UI: [string, string][] = [
  ['border-strong', 'background'], ['border-strong', 'surface'], ['border-strong', 'sunken'], ['border-strong', 'well'],
  ['ring-contrast', 'background'], ['ring-contrast', 'surface'], ['chrome-foreground', 'chrome'],
  ['signal-border', 'signal-soft'], ['signal-border', 'surface'], ['primary', 'sunken'],
]

const ratio = (p: Palette, a: string, b: string) => wcagContrast(parse(p[a]!)!, parse(p[b]!)!)

describe('colour themes', () => {
  test('dark defines exactly the roles light defines', () => {
    expect(Object.keys(colorHexDark).sort()).toEqual(Object.keys(colorHex).sort())
  })

  test('every colour role is a Tailwind colour utility', () => {
    const unmapped = Object.keys(colorHex).filter(k => k !== 'shadow' && !k.endsWith('-weight') && !globals.includes(`--color-${k}: var(--${k});`))
    expect(unmapped).toEqual([])
  })

  test.each(themes)('%s: text pairs meet 4.5:1', (_, p) => {
    const failing = TEXT.filter(([a, b]) => ratio(p, a, b) < 4.5).map(([a, b]) => `${a} on ${b}: ${ratio(p, a, b).toFixed(2)}`)
    expect(failing).toEqual([])
  })

  test.each(themes)('%s: boundaries and focus meet 3:1', (_, p) => {
    const failing = UI.filter(([a, b]) => ratio(p, a, b) < 3).map(([a, b]) => `${a} on ${b}: ${ratio(p, a, b).toFixed(2)}`)
    expect(failing).toEqual([])
  })
})
