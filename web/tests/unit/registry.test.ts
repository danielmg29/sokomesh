import { describe, expect, test } from 'vitest'
import artefact from '../../../contract/ac-contract.json'
import { filterWidgets, inputWidgets } from '@/components/kernel/fields/FieldInput'
import { rendererFor, widgets } from '@/components/kernel/fields/registry'
import { catalogue, chainOf, rowFor } from '@/features/design-system/catalogue'
import type { Contract } from '@/lib/contract/types'

const contract = artefact as Contract
// Read-only by definition: nothing to type into or filter on.
const VIEW_ONLY = ['hidden', 'relative-time']

describe('field registry covers the contract (manual 6.5)', () => {
  test('every widget the contract names has a renderer', () => {
    for (const [model, meta] of Object.entries(contract.models)) {
      for (const f of meta.fields) expect(rendererFor(f.widget), `${model}.${f.name} → ${f.widget}`).toBeDefined()
    }
  })

  test('every editable widget has an input', () => {
    expect(widgets.filter(w => !VIEW_ONLY.includes(w) && !inputWidgets.includes(w))).toEqual([])
  })

  test('inputs and filters only exist for registered widgets', () => {
    expect(inputWidgets.filter(w => !rendererFor(w))).toEqual([])
    expect(filterWidgets.filter(w => !rendererFor(w))).toEqual([])
  })
})

describe('design-system inventory', () => {
  test('codes are unique', () => {
    const codes = catalogue.map(e => e.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  test('template chains link to the row they name first, whole words only', () => {
    expect(rowFor('SplitBlock (media + DetailBlock buy box)')?.name).toBe('SplitBlock')
    expect(rowFor('PriceTierTable')?.name).toBe('PriceTierTable')
    expect(rowFor('pagination, loading and empty')).toBeUndefined()
    for (const t of catalogue.filter(e => e.cls === 'Template')) {
      expect(chainOf(t).filter(s => rowFor(s)).length, t.code).toBeGreaterThanOrEqual(2)
    }
  })

  test('every registered widget has exactly one field specimen row', () => {
    const rows = catalogue.filter(e => e.cls === 'Field').map(e => e.name.replace('Field/', ''))
    expect([...rows].sort()).toEqual(widgets.filter(w => w !== 'hidden').sort())
  })
})
