// Registered resources from the browser: list, read, save and run commands against the routes the
// backend registry generates (`<path>`, `<path>/<ref>`, `<path>/<ref>/<action>`), with the path taken
// from the contract (`meta.path`). One cache key per resource path, so a command anywhere refreshes
// every view of that resource.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { ActionMeta, ListPage, ModelMeta, Rec } from '../contract/types'
import { ApiError, api } from './api'
import { apiSource, type ListSource } from './use-server-list'
import { displayOf } from '../contract/display'

export function pathOf(meta: ModelMeta): string {
  if (!meta.path) throw new Error(`${meta.key} has no API path in the contract`)
  return meta.path
}

/** A server-paged list source for ListBlock (`query="server"`), optionally with fixed parameters. */
export function sourceOf<R = Rec>(meta: ModelMeta, fixed?: Record<string, string>): ListSource<R> {
  const source = apiSource<R>(pathOf(meta))
  if (!fixed) return source
  return (params, signal) => {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(fixed)) merged.set(k, v)
    return source(merged, signal)
  }
}

/**
 * `sourceOf` for a mounted list, renewed whenever the resource is refreshed (`useRefresh`, a command or a
 * save), so a server-paged ListBlock reloads the page it shows. Undefined until the first stamp is read.
 */
export function useSource<R = Rec>(meta: ModelMeta, fixed?: Record<string, string>): ListSource<R> | undefined {
  const path = pathOf(meta)
  const stamp = useQuery({ queryKey: [path, 'stamp'], queryFn: () => Date.now(), staleTime: Infinity }).data
  const fixedKey = JSON.stringify(fixed ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `fixed` is compared by value through fixedKey
  return useMemo(() => (stamp === undefined ? undefined : sourceOf<R>(meta, fixed)), [meta, fixedKey, stamp])
}

export function useList<R = Rec>(meta: ModelMeta, params = '', enabled = true) {
  const path = pathOf(meta)
  return useQuery({
    queryKey: [path, 'list', params],
    queryFn: ({ signal }) => api<ListPage<R>>(`${path}${params ? `?${params}` : ''}`, { signal }),
    enabled,
  })
}

/** One record; `poll` reads it again every so many milliseconds while it returns a number (bounded by the caller). */
export function useRecord<R = Rec>(meta: ModelMeta, ref: string | undefined, poll?: (record: R | undefined) => number | false) {
  const path = pathOf(meta)
  return useQuery({
    queryKey: [path, 'item', ref],
    queryFn: ({ signal }) => api<R>(`${path}/${ref}`, { signal }),
    enabled: Boolean(ref),
    refetchInterval: poll ? query => poll(query.state.data) : undefined,
  })
}

/** Refresh every cached view of the given paths (and the session, whose navigation may change). */
export function useRefresh() {
  const client = useQueryClient()
  return (...paths: string[]) => Promise.all([...paths, 'session'].map(p => client.invalidateQueries({ queryKey: [p] })))
}

/**
 * A RunAction for the kernel's ActionBar and ActionMenu: POST the command, then refresh the resource and
 * any others it affects. A failure rejects with the API's AppError, so ConfirmAction keeps its dialog
 * open with the message.
 */
export function useCommand(meta: ModelMeta, also: readonly ModelMeta[] = []) {
  const refresh = useRefresh()
  const path = pathOf(meta)
  const mutation = useMutation({
    mutationFn: ({ action, record, input }: { action: ActionMeta; record: Rec; input?: Record<string, unknown> }) =>
      api<Rec>(`${path}/${record.id}/${action.name}`, { method: 'POST', body: input ?? {} }),
    onSettled: () => refresh(path, ...also.map(pathOf)),
  })
  // Answers with the record as it is after the command (one-time values, such as a new secret, included).
  const run = async (action: ActionMeta, record: Rec, input?: Record<string, unknown>): Promise<Rec> => {
    try {
      return await mutation.mutateAsync({ action, record, input })
    } catch (err) {
      throw err instanceof ApiError ? err.error : err
    }
  }
  return { run, pending: mutation.isPending ? (mutation.variables?.action.name ?? null) : null }
}

export type BulkProgress =
  | { phase: 'idle' }
  | { phase: 'executing'; action: string; done: number; total: number }
  | { phase: 'complete'; action: string; succeeded: number }
  | { phase: 'error'; action: string; succeeded: number; failed: { label: string; reason: string }[] }

/**
 * One command over many records, one request at a time (bounded: the list never sends more than the
 * contract's `limits.maxBulk`, and the API is never asked in parallel). A record whose `_can` does not offer
 * the command is reported as not changed without asking; the API's refusal of any other is reported with its
 * reason. The resource is refreshed once at the end.
 */
export function useBulkCommand(meta: ModelMeta, also: readonly ModelMeta[] = []) {
  const refresh = useRefresh()
  const path = pathOf(meta)
  const [progress, setProgress] = useState<BulkProgress>({ phase: 'idle' })
  const label = (r: Rec) => displayOf(meta, r)
  const run = async (action: ActionMeta, rows: readonly Rec[]) => {
    const failed: { label: string; reason: string }[] = []
    let succeeded = 0
    setProgress({ phase: 'executing', action: action.name, done: 0, total: rows.length })
    for (const [i, row] of rows.entries()) {
      if (!(row._can ?? []).includes(action.name)) {
        failed.push({ label: label(row), reason: `${action.label} is not possible in its current state.` })
      } else {
        try {
          await api(`${path}/${row.id}/${action.name}`, { method: 'POST', body: {} })
          succeeded += 1
        } catch (err) {
          failed.push({ label: label(row), reason: err instanceof ApiError ? err.error.detail : 'Not changed; try again.' })
        }
      }
      setProgress({ phase: 'executing', action: action.name, done: i + 1, total: rows.length })
    }
    await refresh(path, ...also.map(pathOf))
    setProgress(failed.length ? { phase: 'error', action: action.name, succeeded, failed } : { phase: 'complete', action: action.name, succeeded })
  }
  return { progress, run, reset: () => setProgress({ phase: 'idle' }) }
}

/** Create (`POST <path>`) or update (`PATCH <path>/<ref>`) a record, then refresh its views. */
export function useSave<R = Rec>(meta: ModelMeta, also: readonly ModelMeta[] = []) {
  const refresh = useRefresh()
  const path = pathOf(meta)
  return useMutation({
    mutationFn: ({ ref, body }: { ref?: string; body: Record<string, unknown> }) =>
      api<R>(ref ? `${path}/${ref}` : path, { method: ref ? 'PATCH' : 'POST', body }),
    onSuccess: () => refresh(path, ...also.map(pathOf)),
  })
}
