import { useDeferredValue, useMemo, useState } from 'react'
import { limits } from '../contract/generated'
import { clampPageSize, facetCounts, runQuery, type Accessors, type FilterValue, type Filters, type QueryResult, type Sort, type TableQuery } from '../query'

/** What a table's controls need from any source of rows: memory (`useTableQuery`) or a server (`useServerList`). */
export type TableControls<Row> = {
  query: TableQuery
  result: QueryResult<Row>
  /** True while the shown rows have not caught up with the query (typing, or a request in flight). */
  pending: boolean
  active: boolean
  setSearch: (q: string) => void
  setFilter: (key: string, value: FilterValue | undefined) => void
  setFilters: (filters: Filters) => void
  clear: () => void
  setSort: (sort: Sort | undefined) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  /** Facet counts for one key, or undefined where the source cannot count (one server page). */
  counts: (key: string) => Record<string, number> | undefined
}

/**
 * A table's query state (search, filters, sort, page, page size) and its live result. Typing is deferred,
 * so the field stays responsive while a large table re-filters; any change to what matches or to the order
 * returns to the first page, and a page-size change keeps the first visible row on screen. `access` should
 * be stable (module scope or memoised), because the result is recomputed when it changes.
 */
export function useTableQuery<Row>(rows: readonly Row[], access: Accessors<Row>, initial?: Partial<TableQuery>): Omit<TableControls<Row>, 'counts'> & { counts: (key: string) => Record<string, number> } {
  const [query, setQuery] = useState<TableQuery>(() => ({ q: '', filters: {}, page: 1, pageSize: limits.defaultPageSize, ...initial }))
  const q = useDeferredValue(query.q)
  const result = useMemo(() => runQuery(rows, { ...query, q }, access), [rows, query, q, access])
  return {
    query,
    result,
    /** True while the deferred search has not caught up with what was typed. */
    pending: q !== query.q,
    active: Boolean(query.q.trim()) || Object.values(query.filters).some(Boolean),
    setSearch: (next: string) => setQuery(s => ({ ...s, q: next, page: 1 })),
    setFilter: (key: string, value: FilterValue | undefined) => setQuery(s => ({ ...s, filters: { ...s.filters, [key]: value }, page: 1 })),
    setFilters: (filters: Filters) => setQuery(s => ({ ...s, filters, page: 1 })),
    clear: () => setQuery(s => ({ ...s, q: '', filters: {}, page: 1 })),
    setSort: (sort: Sort | undefined) => setQuery(s => ({ ...s, sort, page: 1 })),
    setPage: (page: number) => setQuery(s => ({ ...s, page })),
    setPageSize: (size: number) => {
      // From the row actually shown: the stored page may sit past the end until the result clamps it.
      const pageSize = clampPageSize(size)
      const first = Math.max(0, result.from - 1)
      setQuery(s => ({ ...s, pageSize, page: Math.floor(first / pageSize) + 1 }))
    },
    /** Live facet counts for one key: what each value would show alongside the other filters. */
    counts: (key: string) => facetCounts(rows, { q, filters: query.filters }, access, key),
  }
}
