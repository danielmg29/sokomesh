// Renders design/tokens/*.json (W3C DTCG) into the web token layer (manual 9.10).
// Brand primitives live in brand-tokens.json; every other file is a semantic layer whose
// values may alias primitives with "{brand.color.primary}". Colours become OKLCH for
// Tailwind v4; hex copies are emitted only for places CSS variables cannot reach.
import { converter, formatHex, formatHex8, parse } from 'culori'

export type Token = { $type: string; $value: string | number | number[]; $description?: string }
export type TokenTree = { [key: string]: TokenTree | Token | string }
export type TokenFiles = Record<string, TokenTree>

const ALIAS = /^\{([^}]+)\}$/
const ROOT_FILES = ['color.light.json', 'shape.json', 'type.json', 'motion.json']
const DENSITIES = ['compact', 'comfortable', 'spacious'] as const
const DEFAULT_DENSITY = 'comfortable'

const toOklch = converter('oklch')
const isToken = (v: unknown): v is Token => typeof v === 'object' && v !== null && '$value' in v
const round = (n: number, d: number) => Number(n.toFixed(d))

function flatten(tree: TokenTree, sep: string, prefix = ''): [string, Token][] {
  return Object.entries(tree).flatMap(([key, value]): [string, Token][] => {
    if (key.startsWith('$') || typeof value === 'string') return []
    const name = `${prefix}${key}`
    return isToken(value) ? [[name, value]] : flatten(value, sep, `${name}${sep}`)
  })
}

function resolver(files: TokenFiles) {
  const lookup = new Map(Object.values(files).flatMap(tree => flatten(tree, '.')))
  return function resolve(token: Token, seen: string[] = []): Token {
    const match = typeof token.$value === 'string' ? ALIAS.exec(token.$value) : null
    if (!match) return token
    const path = match[1]
    if (seen.includes(path)) throw new Error(`token alias cycle: ${[...seen, path].join(' -> ')}`)
    const target = lookup.get(path)
    if (!target) throw new Error(`unknown token alias {${path}}`)
    return resolve(target, [...seen, path])
  }
}

function cssValue(t: Token): string {
  switch (t.$type) {
    case 'color': {
      const c = toOklch(String(t.$value))
      if (!c) throw new Error(`invalid colour ${t.$value}`)
      // 4 decimals on L and C is well inside one 8-bit sRGB step; achromatic hue is 0.
      const hue = c.c < 1e-4 || c.h === undefined ? 0 : round(c.h, 2)
      const alpha = c.alpha !== undefined && c.alpha < 1 ? ` / ${round(c.alpha, 3)}` : ''
      return `oklch(${round(Math.min(c.l, 1), 4)} ${round(c.c, 4)} ${hue}${alpha})`
    }
    case 'dimension': {
      const px = typeof t.$value === 'number' ? t.$value : /^(-?[\d.]+)px$/.exec(String(t.$value))?.[1]
      return px === undefined ? String(t.$value) : `${Number(px) / 16}rem`
    }
    case 'cubicBezier': {
      if (!Array.isArray(t.$value) || t.$value.length !== 4) throw new Error(`invalid cubicBezier ${t.$value}`)
      return `cubic-bezier(${t.$value.join(', ')})`
    }
    default:
      return String(t.$value)
  }
}

function hexOf(value: string): string | undefined {
  const c = parse(value)
  if (!c) return undefined
  return (c.alpha !== undefined && c.alpha < 1 ? formatHex8(c) : formatHex(c))?.toUpperCase()
}

export function renderTokens(files: TokenFiles): { css: string; ts: string } {
  const resolve = resolver(files)
  const entries = (file: string) => (files[file] ? flatten(files[file], '-').map(([k, t]) => [k, resolve(t)] as const) : [])
  const block = (selector: string, rows: (readonly [string, Token])[], prefix = '') =>
    `${selector} {\n${rows.map(([k, t]) => `  --${prefix}${k}: ${cssValue(t)};`).join('\n')}\n}`

  const density = (mode: string) => entries(`density.${mode}.json`)
  const light = entries('color.light.json')
  const rootRows = ROOT_FILES.flatMap(entries)
  const blocks = [block(':root', rootRows)]
  if (density(DEFAULT_DENSITY).length) blocks.push(block(':root', density(DEFAULT_DENSITY), 'density-'))
  const dark = entries('color.dark.json')
  if (dark.length) {
    // System preference unless the reader forced light; data-theme="dark" forces dark.
    blocks.push(`@media (prefers-color-scheme: dark) {
${block(':root:not([data-theme="light"])', dark).replace(/^/gm, '  ')}
}`)
    blocks.push(block(':root[data-theme="dark"]', dark))
  }
  for (const mode of DENSITIES) {
    const rows = density(mode)
    if (rows.length) blocks.push(block(`[data-density="${mode}"]`, rows, 'density-'))
  }
  const css = ['/* AUTO-GENERATED from design/tokens/*.json by tools/gen-tokens.mts — do not edit. */', ...blocks].join('\n\n')

  const brand = files['brand-tokens.json']?.brand as TokenTree | undefined
  const hex = Object.fromEntries(light.map(([k, t]) => [k, hexOf(String(t.$value))]))
  const hexDark = Object.fromEntries(dark.map(([k, t]) => [k, hexOf(String(t.$value))]))
  const ts = [
    '// AUTO-GENERATED from design/tokens/*.json by tools/gen-tokens.mts — do not edit.',
    '// Hex copies of semantic colours for places CSS variables cannot reach (manifest, theme-color, SVG exports).',
    `export const brand = ${JSON.stringify({ name: brand?.name, tagline: brand?.tagline }, null, 2)} as const`,
    `export const colorHex = ${JSON.stringify(hex, null, 2)} as const`,
    `export const colorHexDark = ${JSON.stringify(hexDark, null, 2)} as const`,
    `export const densities = ${JSON.stringify(DENSITIES)} as const`,
    `export type Density = (typeof densities)[number]`,
  ].join('\n')

  return { css: `${css}\n`, ts: `${ts}\n` }
}
