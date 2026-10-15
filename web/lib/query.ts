// Table query engine: search, filters, sorting and pages over rows already held in memory. Pure and
// framework-free, so every table (kernel lists, commerce tables, the chart's table view) runs the same
// algorithm and the tests pin it. Page sizes are bounded by the contract's limits. A server-paged list
// sends the same query to the API instead; nothing here invents a filter the contract has not declared.

import { limits } from './contract/generated'
import type { FieldMeta, ModelMeta, Rec } from './contract/types'

export type FilterOp = 'eq' | 'in' | 'contains' | 'gte' | 'lte' | 'range' | 'isnull' | 'near'
export type FilterValue = { op: FilterOp; value: unknown }
export type Filters = Readonly<Record<string, FilterValue | undefined>>
export type SortDir = 'asc' | 'desc'
export type Sort = { key: string; dir: SortDir }

export type TableQuery = { q: string; filters: Filters; sort?: Sort; page: number; pageSize: number }

/** How the engine reads a row: the text a search looks through, and the value a filter or sort reads. */
export type Accessors<Row> = {
  text: (row: Row) => readonly unknown[]
  value: (row: Row, key: string) => unknown
}

export type QueryResult<Row> = {
  rows: Row[]
  /** Rows that match the search and filters, before paging. */
  total: number
  page: number
  pageCount: number
  pageSize: number
  /** 1-based positions of the first and last row shown; both 0 when nothing matches. */
  from: number
  to: number
}

// Bounds on a typed query, so one keystroke never costs more than a fixed amount of work per row.
const MAX_QUERY = 200
const MAX_TOKENS = 8

/** Case- and accent-insensitive form used on both sides of a match ("Kiambu" finds "kiambú"). */
export const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** The words of a search, deduplicated; every one must appear somewhere in the row. */
export const tokens = (q: string) => [...new Set(fold(q.slice(0, MAX_QUERY)).split(' ').filter(Boolean))].slice(0, MAX_TOKENS)

/** Display text of any value the API sends: strings, numbers, relations, rich text, lists. */
export function textOf(v: unknown): string {
  if (v === null || v === undefined || typeof v === 'boolean') return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.map(textOf).join(' ')
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return textOf(o.label ?? o.text ?? o.name ?? '')
  }
  return ''
}

/** The identity a choice or relation filter compares: a relation's id, otherwise the value itself. */
const keyOf = (v: unknown): string | null => {
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v && typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id)
  return null
}

const numberOf = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v)
  return null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/
const empty = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)

type Bounds = { min?: unknown; max?: unknown }

/** Inclusive bounds over numbers, or over calendar dates (the record's own local date, its first ten characters). */
function within(v: unknown, { min, max }: Bounds): boolean {
  const lo = min === '' ? undefined : min
  const hi = max === '' ? undefined : max
  if (lo === undefined && hi === undefined) return true
  if (typeof v === 'string' && ISO_DATE.test(v)) {
    const d = v.slice(0, 10)
    return (lo === undefined || d >= String(lo).slice(0, 10)) && (hi === undefined || d <= String(hi).slice(0, 10))
  }
  const n = numberOf(v)
  if (n === null) return false
  const a = lo === undefined ? null : numberOf(lo)
  const b = hi === undefined ? null : numberOf(hi)
  return (a === null || n >= a) && (b === null || n <= b)
}

/** One filter against one value. Operators the client cannot evaluate (distance) match nothing. */
export function matches(v: unknown, f: FilterValue): boolean {
  switch (f.op) {
    case 'in': {
      const list = Array.isArray(f.value) ? f.value.map(String) : []
      if (!list.length) return true
      return Array.isArray(v) ? v.some(x => list.includes(keyOf(x) ?? '')) : list.includes(keyOf(v) ?? '')
    }
    case 'eq':
      return typeof f.value === 'boolean' ? v === f.value : keyOf(v) === keyOf(f.value)
    case 'contains':
      return fold(textOf(v)).includes(fold(String(f.value ?? '')))
    case 'range':
      return within(v, (f.value ?? {}) as Bounds)
    case 'gte':
      return within(v, { min: f.value })
    case 'lte':
      return within(v, { max: f.value })
    case 'isnull':
      return empty(v) === Boolean(f.value)
    default:
      return false
  }
}

const collator = new Intl.Collator('en-KE', { numeric: true, sensitivity: 'base' })

/** Type-aware order: numbers by value, dates by instant, everything else by its text; blanks sort last. */
export function compare(a: unknown, b: unknown): number {
  const ea = empty(a), eb = empty(b)
  if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1
  const na = numberOf(a), nb = numberOf(b)
  if (na !== null && nb !== null) return na - nb
  if (typeof a === 'string' && typeof b === 'string' && ISO_DATE.test(a) && ISO_DATE.test(b)) {
    const ta = Date.parse(a), tb = Date.parse(b)
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return collator.compare(textOf(a), textOf(b))
}

/** Page sizes a reader may choose, never above the contract's maximum. */
export const pageSizes = [10, 25, 50, 100].filter(n => n <= limits.maxPageSize)
export const clampPageSize = (n: number) => Math.min(Math.max(1, Math.floor(n) || limits.defaultPageSize), limits.maxPageSize)

/** Rows matching every search word and every active filter (`skip` leaves one filter out, for facet counts). */
export function filterRows<Row>(rows: readonly Row[], q: string, filters: Filters, access: Accessors<Row>, skip?: string): Row[] {
  const words = tokens(q)
  const active = Object.entries(filters).filter((e): e is [string, FilterValue] => Boolean(e[1]) && e[0] !== skip)
  if (!words.length && !active.length) return [...rows]
  return rows.filter(row => {
    if (words.length) {
      const hay = fold(access.text(row).map(textOf).join(' '))
      if (!words.every(w => hay.includes(w))) return false
    }
    return active.every(([key, f]) => matches(access.value(row, key), f))
  })
}

/** Stable, type-aware sort; blanks stay last in both directions and ties keep their original order. */
export function sortRows<Row>(rows: readonly Row[], sort: Sort, access: Accessors<Row>): Row[] {
  const sign = sort.dir === 'asc' ? 1 : -1
  return rows
    .map((row, i) => ({ row, i, v: access.value(row, sort.key) }))
    .sort((x, y) => {
      const ex = empty(x.v), ey = empty(y.v)
      if (ex || ey) return ex === ey ? x.i - y.i : ex ? 1 : -1
      return sign * compare(x.v, y.v) || x.i - y.i
    })
    .map(o => o.row)
}

/** One page of already matched rows. The page is clamped, so a shrinking result never strands the reader. */
export function paginate<Row>(rows: readonly Row[], page: number, size: number): QueryResult<Row> {
  const pageSize = clampPageSize(size)
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount)
  const start = (current - 1) * pageSize
  return { rows: rows.slice(start, start + pageSize), total, page: current, pageCount, pageSize, from: total ? start + 1 : 0, to: Math.min(total, start + pageSize) }
}

/** Search, filter, sort, then cut one page. */
export function runQuery<Row>(rows: readonly Row[], query: TableQuery, access: Accessors<Row>): QueryResult<Row> {
  const hits = filterRows(rows, query.q, query.filters, access)
  return paginate(query.sort ? sortRows(hits, query.sort, access) : hits, query.page, query.pageSize)
}

/**
 * Facet counts: for each value of `key`, how many rows match the search and every other filter. A choice's
 * count therefore says what picking it would show, and choices that would show nothing can be disabled.
 */
export function facetCounts<Row>(rows: readonly Row[], query: Pick<TableQuery, 'q' | 'filters'>, access: Accessors<Row>, key: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of filterRows(rows, query.q, query.filters, access, key)) {
    const v = access.value(row, key)
    for (const k of (Array.isArray(v) ? v : [v]).map(keyOf)) if (k !== null) counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}

/** Page buttons to show: the first, the last and a window around the current page, with gaps between. */
export function pageWindow(page: number, pageCount: number, span = 1): (number | 'gap')[] {
  const keep = new Set([1, pageCount])
  for (let p = page - span; p <= page + span; p++) if (p >= 1 && p <= pageCount) keep.add(p)
  const sorted = [...keep].sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ['gap' as const, p] : [p]))
}

/** Fields of a model the client can filter: declared filter operators other than distance, which needs the server. */
export const clientFilterable = (meta: ModelMeta): FieldMeta[] => meta.fields.filter(f => f.filter?.some(op => op !== 'near'))

/** How records of a contract model are read: search covers `meta.search`, values are the record's own fields. */
export function recordAccess(meta: ModelMeta): Accessors<Rec> {
  const searchable = meta.search ?? []
  return { text: r => searchable.map(name => r[name]), value: (r, key) => r[key] }
}
