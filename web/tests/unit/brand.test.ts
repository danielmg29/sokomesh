import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { icons, logoBox, logos, reversedLogos, socialCard } from '@/lib/brand'

const PUBLIC = join(__dirname, '..', '..', 'public')

describe('brand assets', () => {
  test('every registered asset exists under public/brand', () => {
    const paths = [...Object.values(logos).map(l => l.src), ...Object.values(reversedLogos), ...Object.values(icons), socialCard.src]
    for (const p of paths) expect(existsSync(join(PUBLIC, p)), p).toBe(true)
  })

  test('minimum sizes are enforced', () => {
    expect(logoBox('mark', 8).width).toBe(20)
    expect(logoBox('lockup', 100).width).toBe(200) // the tagline needs the room (trimmed lockup, decision 51)
    expect(logoBox('wordmark', 60).width).toBe(120)
  })

  test('clear space is a quarter of the rendered mark width', () => {
    expect(logoBox('mark', 40).clearSpace).toBe(10)
    // At their native widths both lockups draw the kit mark (a 512 box at 0.59 scale, about 225 units wide).
    expect(logoBox('lockup', logos.lockup.width).clearSpace).toBe(Math.ceil(225 / 4))
    expect(logoBox('wordmark', logos.wordmark.width).clearSpace).toBe(Math.ceil(225 / 4))
  })
})
