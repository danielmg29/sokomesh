import { useEffect, useState } from 'react'
import { API_BASE } from '../contract/generated'
import type { AppError, ListPage, ModelMeta } from '../contract/types'
import { clampPageSize, toListParams, type QueryResult, type TableQuery } from '../query'
import type { TableControls } from './use-table-query'

/** Answers one list request. Must stop work and reject when `signal` aborts. */
export type ListSource<Row> = (params: URLSearchParams, signal: AbortSignal) => Promise<ListPage<Row>>

export type ServerListControls<Row> = TableControls<Row> & {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: AppError
  hasNext: boolean
  totalCapped: boolean
  retry: () => void
}

// Wait for a pause in typing before asking the server; filters, sort and pages ask at once.
const SEARCH_PAUSE_MS = 250

const unavailable: AppError = { code: 'UNAVAILABLE', detail: 'The list could not be loaded.', fields: {}, retryable: true }
const isAppError = (v: unknown): v is AppError =>
  typeof v === 'object' && v !== null && typeof (v as AppError).code === 'string' && typeof (v as AppError).detail === 'string'
const isListPage = <Row>(v: unknown): v is ListPage<Row> =>
  typeof v === 'object' && v !== null && Array.isArray((v as ListPage<Row>).results) && typeof (v as ListPage<Row>).total === 'number'

function usePaused<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return settled
}

/** A list endpoint under the contract's API base, read with the session cookie; failures become the API's AppError. */
export function apiSource<Row>(path: string): ListSource<Row> {
  return async (params, signal) => {
    const res = await fetch(`${API_BASE}${path.replace(/^\//, '')}?${params}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) throw isAppError(body) ? body : unavailable
    if (!isListPage<Row>(body)) throw unavailable
    return body
  }
}

/**
 * A server-paged list behind the same controls as an in-memory table. The query is sent as the contract's
 * `listQuery` parameters; each page opens from the cursor the previous page returned, so pages are reached
 * by previous and next (and any page already visited), not by number. A superseded request is aborted, and
 * the rows shown stay on screen while the next ones load. Anything that changes what matches starts again
 * from the first page.
 */
export function useServerList<Row>(source: ListSource<Row> | undefined, meta: ModelMeta, initial?: Partial<TableQuery>): ServerListControls<Row> {
  const [query, setQuery] = useState<TableQuery>(() => ({ q: '', filters: {}, page: 1, pageSize: clampPageSize(meta.list.defaultPageSize), ...initial }))
  // The cursor that opens each page, by page number minus one; page 1 needs none.
  const [cursors, setCursors] = useState<readonly (string | null)[]>([null])
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; page?: ListPage<Row>; error?: AppError } | null>(null)
  const q = usePaused(query.q, SEARCH_PAUSE_MS)
  const { filters, sort, pageSize, page } = query
  const cursor = cursors[page - 1] ?? null
  const key = `${toListParams(meta, { q, filters, sort, pageSize }, cursor)}|${attempt}`

  useEffect(() => {
    if (!source) return
    const controller = new AbortController()
    const params = toListParams(meta, { q, filters, sort, pageSize }, cursor)
    const requestKey = `${params}|${attempt}`
    source(params, controller.signal).then(
      body => {
        setLoaded({ key: requestKey, page: body })
        if (body.next) setCursors(c => (c[page] === body.next ? c : [...c.slice(0, page), body.next]))
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, error: isAppError(err) ? err : unavailable })
      },
    )
    return () => controller.abort()
  }, [source, meta, q, filters, sort, pageSize, page, cursor, attempt])

  const status = !source ? 'idle' : loaded?.key !== key ? 'loading' : loaded.error ? 'error' : 'ready'
  const body = loaded?.page
  const rows = body?.results ?? []
  const size = clampPageSize(pageSize)
  const total = body?.total ?? 0
  const from = rows.length ? (page - 1) * size + 1 : 0
  const result: QueryResult<Row> = { rows, total, page, pageCount: Math.max(page, Math.ceil(total / size)), pageSize: size, from, to: from ? from + rows.length - 1 : 0 }
  const restart = (patch: Partial<TableQuery>) => {
    setQuery(s => ({ ...s, ...patch, page: 1 }))
    setCursors([null])
  }

  return {
    query,
    result,
    status,
    error: status === 'error' ? loaded?.error : undefined,
    hasNext: status !== 'error' && Boolean(body?.next) && loaded?.key === key,
    totalCapped: Boolean(body?.totalCapped),
    pending: q !== query.q || status === 'loading',
    active: Boolean(query.q.trim()) || Object.values(filters).some(Boolean),
    setSearch: next => restart({ q: next }),
    setFilter: (k, value) => restart({ filters: { ...filters, [k]: value } }),
    setFilters: next => restart({ filters: next }),
    clear: () => restart({ q: '', filters: {} }),
    setSort: next => restart({ sort: next }),
    // Keyset pages: the next page once its cursor is known, or any page already visited.
    setPage: p => {
      if (p >= 1 && p <= cursors.length) setQuery(s => ({ ...s, page: p }))
    },
    setPageSize: next => restart({ pageSize: clampPageSize(next) }),
    counts: () => undefined,
    retry: () => setAttempt(a => a + 1),
  }
}
