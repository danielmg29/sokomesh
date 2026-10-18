// Registered resources from the browser: list, read, save and run commands against the routes the
// backend registry generates (`<path>`, `<path>/<ref>`, `<path>/<ref>/<action>`), with the path taken
// from the contract (`meta.path`). One cache key per resource path, so a command anywhere refreshes
// every view of that resource.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ActionMeta, ListPage, ModelMeta, Rec } from '../contract/types'
import { ApiError, api } from './api'
import { apiSource, type ListSource } from './use-server-list'

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

export function useRecord<R = Rec>(meta: ModelMeta, ref: string | undefined) {
  const path = pathOf(meta)
  return useQuery({
    queryKey: [path, 'item', ref],
    queryFn: ({ signal }) => api<R>(`${path}/${ref}`, { signal }),
    enabled: Boolean(ref),
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
  const run = async (action: ActionMeta, record: Rec, input?: Record<string, unknown>) => {
    try {
      await mutation.mutateAsync({ action, record, input })
    } catch (err) {
      throw err instanceof ApiError ? err.error : err
    }
  }
  return { run, pending: mutation.isPending ? (mutation.variables?.action.name ?? null) : null }
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
