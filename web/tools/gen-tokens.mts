import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { renderTokens, type TokenFiles } from './tokens.mts'

const DIR = join('..', 'design', 'tokens')
const files: TokenFiles = Object.fromEntries(
  readdirSync(DIR)
    .filter(f => f.endsWith('.json') && f !== 'meta.json')
    .map(f => [f, JSON.parse(readFileSync(join(DIR, f), 'utf8'))]),
)
const { css, ts } = renderTokens(files)

for (const [path, body] of [['app/tokens.generated.css', css], ['lib/design/tokens.generated.ts', ts]] as const) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, body)
  console.log(`wrote ${path}`)
}
