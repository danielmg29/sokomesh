// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { useServerList, type ListSource } from '@/lib/client/use-server-list'
import { listQuery } from '@/lib/contract/generated'
import type { AppError, ListPage, ModelMeta, Rec } from '@/lib/contract/types'

const meta: ModelMeta = {
  key: 'order', label: 'Order', search: ['number'], ordering: ['-number'],
  list: { fields: ['number'], defaultPageSize: 2, maxPageSize: 100 },
  fields: [{ name: 'number', type: 'string', widget: 'code' }, { name: 'status', type: 'enum', widget: 'status', filter: ['in'] }],
}
const rows: Rec[] = ['SM-1', 'SM-2', 'SM-3', 'SM-4', 'SM-5'].map((number, i) => ({ id: String(i), number, status: i % 2 ? 'delivered' : 'submitted' }))

/** A stand-in server: answers from `rows` by offset cursor, and records every request and abort. */
function fakeServer() {
  const requests: URLSearchParams[] = []
  const aborted: string[] = []
  const source: ListSource<Rec> = (params, signal) => {
    requests.push(params)
    signal.addEventListener('abort', () => aborted.push(params.toString()))
    const q = params.get(listQuery.search) ?? ''
    const statuses = params.get('status__in')?.split(listQuery.listSeparator)
    const hits = rows.filter(r => String(r.number).toLowerCase().includes(q.toLowerCase()) && (!statuses || statuses.includes(String(r.status))))
    const size = Number(params.get(listQuery.pageSize))
    const at = Number(params.get(listQuery.cursor) ?? 0)
    const page: ListPage<Rec> = { results: hits.slice(at, at + size), next: at + size < hits.length ? String(at + size) : null, total: hits.length, totalCapped: false, pageSize: size }
    return Promise.resolve(page)
  }
  return { source, requests, aborted }
}

describe('useServerList', () => {
  test('loads the first page, then follows the cursor forward and back', async () => {
    const server = fakeServer()
    const { result } = renderHook(() => useServerList(server.source, meta))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.result.rows.map(r => r.number)).toEqual(['SM-1', 'SM-2'])
    expect([result.current.result.from, result.current.result.to, result.current.result.total, result.current.hasNext]).toEqual([1, 2, 5, true])

    act(() => result.current.setPage(2))
    await waitFor(() => expect(result.current.result.rows.map(r => r.number)).toEqual(['SM-3', 'SM-4']))
    expect(server.requests.at(-1)!.get(listQuery.cursor)).toBe('2')
    expect([result.current.result.from, result.current.result.to]).toEqual([3, 4])

    act(() => result.current.setPage(9)) // not reachable by keyset: ignored
    expect(result.current.result.page).toBe(2)
    act(() => result.current.setPage(1))
    await waitFor(() => expect(result.current.result.rows.map(r => r.number)).toEqual(['SM-1', 'SM-2']))
  })

  test('waits for a pause in typing, then starts again from the first page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const server = fakeServer()
      const { result } = renderHook(() => useServerList(server.source, meta))
      await waitFor(() => expect(result.current.status).toBe('ready'))
      const before = server.requests.length
      act(() => { result.current.setSearch('s'); result.current.setSearch('sm-'); result.current.setSearch('sm-5') })
      expect(result.current.pending).toBe(true)
      await act(async () => { await vi.advanceTimersByTimeAsync(300) })
      await waitFor(() => expect(result.current.result.rows.map(r => r.number)).toEqual(['SM-5']))
      // One request for the settled search, none for the keystrokes before it.
      const searched = server.requests.slice(before).map(p => p.get(listQuery.search))
      expect(searched.filter(Boolean)).toEqual(['sm-5'])
      expect(result.current.result.page).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('aborts a request the reader has moved past', async () => {
    const server = fakeServer()
    const { result } = renderHook(() => useServerList(server.source, meta))
    act(() => result.current.setFilter('status', { op: 'in', value: ['delivered'] }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(server.aborted.length).toBeGreaterThan(0)
    expect(server.requests.at(-1)!.get('status__in')).toBe('delivered')
    expect(result.current.result.rows.every(r => r.status === 'delivered')).toBe(true)
  })

  test('reports the API error and retries on request', async () => {
    let fail = true
    const error: AppError = { code: 'UNAVAILABLE', detail: 'Down', fields: {}, retryable: true }
    const server = fakeServer()
    const flaky: ListSource<Rec> = (params, signal) => (fail ? Promise.reject(error) : server.source(params, signal))
    const { result } = renderHook(() => useServerList(flaky, meta))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toEqual(error)
    fail = false
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  test('does nothing without a source', () => {
    const { result } = renderHook(() => useServerList<Rec>(undefined, meta))
    expect(result.current.status).toBe('idle')
  })
})
