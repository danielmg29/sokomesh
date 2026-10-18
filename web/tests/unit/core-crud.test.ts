import { describe, expect, test } from 'vitest'
import { COMPARE_LIMIT, nextSelection, type ComparePick } from '@/components/commerce/compare'
import { choiceValue, definitionFromDraft, draftFromRecord } from '@/features/categories/CategoryContractBuilder'
import { listingMeta } from '@/features/storefront/Storefront'
import type { CategoryContractRecord } from '@/lib/client/records'
import type { FieldMeta } from '@/lib/contract/types'
import { apiListParams, fromListParams, toListParams } from '@/lib/query'

const pick = (id: string, category = 'flour'): ComparePick => ({ id, name: id, category, categoryLabel: category })

describe('comparison selection (SM-F-09)', () => {
  test('adds, removes, stays within one category and stops at the limit', () => {
    let list: readonly ComparePick[] = []
    for (const id of ['a', 'b', 'c', 'd']) list = nextSelection(list, pick(id)).list
    expect(list).toHaveLength(COMPARE_LIMIT)
    expect(nextSelection(list, pick('e')).outcome).toBe('full')
    expect(nextSelection(list, pick('b')).list.map(p => p.id)).toEqual(['a', 'c', 'd'])
    const other = nextSelection(list, pick('s', 'sugar'))
    expect(other.outcome).toBe('replaced')
    expect(other.list.map(p => p.id)).toEqual(['s'])
  })
})

describe('URL list parameters (SM-F-08)', () => {
  test('a page URL goes to the API without its display-only page number, with the route category fixed', () => {
    const params = apiListParams({ q: 'maize', 'attr.grain__in': 'maize,wheat', page: '3', cursor: 'abc', category__eq: 'spoofed' }, { category__eq: 'cat-1' })
    expect(Object.fromEntries(params)).toEqual({ q: 'maize', 'attr.grain__in': 'maize,wheat', cursor: 'abc', category__eq: 'cat-1' })
  })

  test('contract facets join the product meta and survive a round trip through the URL', () => {
    const grain: FieldMeta = { name: 'attr.grain', type: 'enum', widget: 'select', label: 'Grain', filter: ['in'], choices: [{ value: 'maize', label: 'Maize' }, { value: 'wheat', label: 'Wheat' }] }
    const size: FieldMeta = { name: 'attr.unit_size', type: 'decimal', widget: 'decimal', label: 'Size', filter: ['range'] }
    const meta = listingMeta([grain, size])
    const query = { q: '', filters: { 'attr.grain': { op: 'in' as const, value: ['maize'] }, 'attr.unit_size': { op: 'range' as const, value: { min: '1', max: '2' } } }, pageSize: 24 }
    const params = toListParams(meta, query)
    expect(params.get('attr.grain__in')).toBe('maize')
    expect(params.get('attr.unit_size__gte')).toBe('1')
    expect(fromListParams(meta, params).filters).toEqual(query.filters)
  })
})

describe('category contract drafts (SM-F-03)', () => {
  test('choice values are lowercase words', () => {
    expect(choiceValue('All-purpose')).toBe('all_purpose')
    expect(choiceValue('Whole meal')).toBe('whole_meal')
  })

  test('a record becomes a draft and back without losing anything the API stores', () => {
    const record = {
      name: 'Flour & grains',
      attribute_schema: [
        { key: 'grain', label: 'Grain', type: 'enum', required: true, choices: [{ value: 'maize', label: 'Maize' }] },
        { key: 'unit_size', label: 'Size', type: 'decimal', unit: 'kg', required: true },
        { key: 'colour', label: 'Colour', type: 'enum', variant: true, choices: [{ value: 'green', label: 'Green' }] },
      ],
      unit_rules: { sale_units: ['bale', 'sack'], normalise: { attribute: 'unit_size', per: 'kg', factor: 1 } },
      facet_keys: ['grain', 'colour'],
      comparison_keys: ['grain', 'unit_size'],
      display_recipe: { card_keys: ['unit_size'], spec_keys: ['grain', 'unit_size'] },
      seller_guidance: { html: '<p>Sellers</p>', text: 'Sellers' },
      buyer_guidance: { html: '', text: '' },
    } satisfies Partial<CategoryContractRecord>
    const back = definitionFromDraft(draftFromRecord(record as unknown as CategoryContractRecord))
    expect(back.attribute_schema).toEqual(record.attribute_schema)
    expect(back.unit_rules).toEqual(record.unit_rules)
    expect(back.facet_keys).toEqual(record.facet_keys)
    expect(back.comparison_keys).toEqual(record.comparison_keys)
    expect(back.display_recipe).toEqual(record.display_recipe)
  })
})
