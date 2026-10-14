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

  test('minimum sizes from ASSET_USAGE are enforced', () => {
    expect(logoBox('mark', 8).width).toBe(20)
    expect(logoBox('lockup', 100).width).toBe(160)
  })

  test('clear space is a quarter of the rendered mark width', () => {
    expect(logoBox('mark', 40).clearSpace).toBe(10)
    expect(logoBox('lockup', 1600).clearSpace).toBe(Math.ceil((512 * 0.59) / 4))
  })
})
