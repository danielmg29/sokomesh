import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'

// DESIGN.md "Copy rules": no em or en dash in visible text; ranges read "10 to 49".
const WEB = join(__dirname, '..', '..')
const DIRS = ['app', 'components', 'features', 'lib']

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sources(p)
    return /\.(ts|tsx)$/.test(name) && !name.includes('generated') ? [p] : []
  })
}

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, '')).replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('copy rules', () => {
  test('no em or en dash outside comments', () => {
    const hits = DIRS.flatMap(d => sources(join(WEB, d))).flatMap(p =>
      stripComments(readFileSync(p, 'utf8')).split('\n').flatMap((line, i) =>
        /[–—]/.test(line) ? [`${relative(WEB, p)}:${i + 1}`] : []))
    expect(hits).toEqual([])
  })
})
