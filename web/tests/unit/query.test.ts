import { describe, expect, test } from 'vitest'
import { limits } from '@/lib/contract/generated'
import type { ModelMeta } from '@/lib/contract/types'
import { clampPageSize, clientFilterable, compare, facetCounts, fold, matches, pageSizes, pageWindow, recordAccess, runQuery, tokens, type Accessors, type TableQuery } from '@/lib/query'

type Row = { id: string; name: string; seller: { id: string; label: string }; status: string; total: string; at: string; tags?: string[]; note?: string }

const rows: Row[] = [
  { id: 'a', name: 'Mavuno Maize Flour 2 kg', seller: { id: 's1', label: 'Mwangaza Wholesalers' }, status: 'submitted', total: '48250.00', at: '2026-10-12T11:18:00+03:00', tags: ['flour'] },
  { id: 'b', name: 'Sukari Bora Sugar 1 kg', seller: { id: 's2', label: 'Rift Valley Traders' }, status: 'confirmed', total: '21360.00', at: '2026-10-12T09:02:00+03:00', note: 'Café order' },
  { id: 'c', name: 'Jua Gold Cooking Oil 3 L', seller: { id: 's1', label: 'Mwangaza Wholesalers' }, status: 'delivered', total: '96480.00', at: '2026-10-11T15:44:00+03:00', tags: ['oil', 'flour'] },
  { id: 'd', name: 'Mwea Pishori Rice 25 kg', seller: { id: 's3', label: 'Pwani Distributors' }, status: 'delivered', total: '8700.00', at: '2026-10-09T13:30:00+03:00' },
  { id: 'e', name: 'Unga Bora Baking Flour 2 kg', seller: { id: 's2', label: 'Rift Valley Traders' }, status: 'submitted', total: '', at: '2026-10-10T08:15:00+03:00' },
]
const access: Accessors<Row> = { text: r => [r.name, r.seller, r.note], value: (r, k) => r[k as keyof Row] }
const q = (patch: Partial<TableQuery> = {}): TableQuery => ({ q: '', filters: {}, page: 1, pageSize: 25, ...patch })
const ids = (patch: Partial<TableQuery>) => runQuery(rows, q(patch), access).rows.map(r => r.id)

describe('search', () => {
  test('every word must match, in any field, ignoring case and accents', () => {
    expect(ids({ q: 'flour mwangaza' })).toEqual(['a'])
    expect(ids({ q: 'BORA' })).toEqual(['b', 'e'])
    expect(ids({ q: 'cafe' })).toEqual(['b'])
    expect(fold('  Café   ORDER ')).toBe('cafe order')
  })
  test('queries are bounded and deduplicated', () => {
    expect(tokens('a a b')).toEqual(['a', 'b'])
    expect(tokens('w '.repeat(50)).length).toBe(1)
    expect(tokens(Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ')).length).toBe(8)
  })
  test('an empty query matches everything', () => {
    expect(ids({ q: '   ' })).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('filters', () => {
  test('in over values, relations by id, and lists by any member', () => {
    expect(ids({ filters: { status: { op: 'in', value: ['delivered'] } } })).toEqual(['c', 'd'])
    expect(ids({ filters: { seller: { op: 'in', value: ['s2'] } } })).toEqual(['b', 'e'])
    expect(ids({ filters: { tags: { op: 'in', value: ['oil'] } } })).toEqual(['c'])
  })
  test('eq on relations and booleans', () => {
    expect(ids({ filters: { seller: { op: 'eq', value: 's3' } } })).toEqual(['d'])
    expect(matches(true, { op: 'eq', value: true })).toBe(true)
    expect(matches(false, { op: 'eq', value: true })).toBe(false)
  })
  test('numeric ranges are inclusive and skip blanks', () => {
    expect(ids({ filters: { total: { op: 'range', value: { min: '21360', max: '48250' } } } })).toEqual(['a', 'b'])
    expect(ids({ filters: { total: { op: 'range', value: { min: '50000' } } } })).toEqual(['c'])
    expect(ids({ filters: { total: { op: 'range', value: { min: '', max: '' } } } })).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
  test('date ranges compare the record’s own calendar date', () => {
    expect(ids({ filters: { at: { op: 'range', value: { min: '2026-10-11', max: '2026-10-11' } } } })).toEqual(['c'])
    expect(ids({ filters: { at: { op: 'range', value: { max: '2026-10-10' } } } })).toEqual(['d', 'e'])
  })
  test('contains, isnull, and operators the client cannot evaluate', () => {
    expect(matches('Mwea Pishori', { op: 'contains', value: 'pish' })).toBe(true)
    expect(ids({ filters: { total: { op: 'isnull', value: true } } })).toEqual(['e'])
    expect(matches({ lat: 0, lng: 0 }, { op: 'near', value: '10' })).toBe(false)
  })
  test('search and filters combine', () => {
    expect(ids({ q: 'flour', filters: { status: { op: 'in', value: ['submitted'] } } })).toEqual(['a', 'e'])
  })
})

describe('sorting', () => {
  test('numbers by value, blanks last in both directions, ties stable', () => {
    expect(ids({ sort: { key: 'total', dir: 'asc' } })).toEqual(['d', 'b', 'a', 'c', 'e'])
    expect(ids({ sort: { key: 'total', dir: 'desc' } })).toEqual(['c', 'a', 'b', 'd', 'e'])
    expect(ids({ sort: { key: 'status', dir: 'asc' } })).toEqual(['b', 'c', 'd', 'a', 'e'])
  })
  test('dates by instant, text by collation with numbers in order', () => {
    expect(ids({ sort: { key: 'at', dir: 'desc' } })).toEqual(['a', 'b', 'c', 'e', 'd'])
    expect(compare('Pack 9', 'Pack 10')).toBeLessThan(0)
    expect(compare({ label: 'b' }, { label: 'A' })).toBeGreaterThan(0)
  })
})

describe('pages', () => {
  test('cuts pages and reports the range', () => {
    const r = runQuery(rows, q({ page: 2, pageSize: 2 }), access)
    expect(r.rows.map(x => x.id)).toEqual(['c', 'd'])
    expect([r.from, r.to, r.total, r.pageCount]).toEqual([3, 4, 5, 3])
  })
  test('clamps a page past the end and reports an empty result as zeros', () => {
    expect(runQuery(rows, q({ page: 9, pageSize: 2 }), access).page).toBe(3)
    const none = runQuery(rows, q({ q: 'nothing' }), access)
    expect([none.total, none.from, none.to, none.page, none.pageCount]).toEqual([0, 0, 0, 1, 1])
  })
  test('page sizes never exceed the contract maximum', () => {
    expect(clampPageSize(10_000)).toBe(limits.maxPageSize)
    expect(clampPageSize(Number.NaN)).toBe(limits.defaultPageSize)
    expect(Math.max(...pageSizes)).toBeLessThanOrEqual(limits.maxPageSize)
  })
  test('page window keeps the ends and a span around the current page', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(5, 9)).toEqual([1, 'gap', 4, 5, 6, 'gap', 9])
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4])
  })
})

describe('facet counts', () => {
  test('count each value with every other filter applied, but not its own', () => {
    const counts = facetCounts(rows, { q: '', filters: { status: { op: 'in', value: ['delivered'] }, seller: { op: 'in', value: ['s1'] } } }, access, 'status')
    expect(counts).toEqual({ submitted: 1, delivered: 1 })
    // "flour" finds a and e by name; only a carries the tag (tags are filtered, not searched).
    expect(facetCounts(rows, { q: 'flour', filters: {} }, access, 'tags')).toEqual({ flour: 1 })
  })
})

describe('contract records', () => {
  const meta: ModelMeta = {
    key: 'order', label: 'Order', list: { fields: ['number'], defaultPageSize: 25, maxPageSize: 100 }, search: ['number'],
    fields: [
      { name: 'number', type: 'string', widget: 'code' },
      { name: 'status', type: 'enum', widget: 'status', filter: ['in'] },
      { name: 'place', type: 'location', widget: 'location', filter: ['near'] },
      { name: 'note', type: 'text', widget: 'textarea' },
    ],
  }
  test('search reads only the declared search fields', () => {
    const recs = [{ id: '1', number: 'SM-ORD-1', note: 'urgent' }, { id: '2', number: 'SM-ORD-2', note: 'SM-ORD-1 follow-up' }]
    expect(runQuery(recs, q({ q: 'SM-ORD-1' }), recordAccess(meta)).rows.map(r => r.id)).toEqual(['1'])
    expect(runQuery(recs, q({ q: 'urgent' }), recordAccess(meta)).total).toBe(0)
  })
  test('only fields with operators the client can evaluate are offered as filters', () => {
    expect(clientFilterable(meta).map(f => f.name)).toEqual(['status'])
  })
})
