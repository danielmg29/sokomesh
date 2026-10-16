// Design system only: a stand-in for a list endpoint, so `ListBlock query="server"` can be seen working
// before the first real endpoint lands (SM-F-01). It reads the contract's list parameters back with
// `fromListParams`, answers from demo rows after a delay and pages by an offset cursor. Real lists use
// `apiSource(path)`, whose cursors are the backend's signed keyset cursors.

import type { ListSource } from '@/lib/client/use-server-list'
import type { ModelMeta, Rec } from '@/lib/contract/types'
import { filterRows, fromListParams, recordAccess, sortRows } from '@/lib/query'

export function demoListSource(meta: ModelMeta, rows: readonly Rec[], latencyMs = 450): ListSource<Rec> {
  const access = recordAccess(meta)
  return (params, signal) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const { q, filters, sort, pageSize, cursor } = fromListParams(meta, params)
        const hits = filterRows(rows, q, filters, access)
        const ordered = sort ? sortRows(hits, sort, access) : hits
        const offset = Math.max(0, Number(cursor) || 0)
        resolve({
          results: ordered.slice(offset, offset + pageSize),
          next: offset + pageSize < ordered.length ? String(offset + pageSize) : null,
          total: ordered.length,
          totalCapped: false,
          pageSize,
        })
      }, latencyMs)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('The request was replaced by a newer one.', 'AbortError'))
      }, { once: true })
    })
}
