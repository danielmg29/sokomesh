'use client'

// Controls for a server-rendered list whose state lives in the URL (filters, search, sort, page size and
// page): the page reads these parameters on the server and sends them to the API as they are, so the URL
// is the API query (the contract's `listQuery` grammar), shareable and crawlable. These islands only
// rewrite the URL; they never fetch. Anything that changes what matches starts again from the first page.

import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import type { ComboOption } from '@/components/ui/combobox'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { limits, listQuery } from '@/lib/contract/generated'
import type { ListPage, ModelMeta } from '@/lib/contract/types'
import { PAGE_PARAM, fromListParams, toListParams, type TableQuery } from '@/lib/query'
import { Pagination } from '../nav/Pagination'
import { FiltersBlock, SortSelect } from './FiltersBlock'

/** Products per page a buyer may choose (grid rows of 4 and 3), never above the contract maximum. */
export const listPageSizes = [12, 24, 48, 96].filter(n => n <= limits.maxPageSize)
const SEARCH_PAUSE_MS = 350

type Draft = Pick<TableQuery, 'q' | 'filters' | 'sort' | 'pageSize'>

/** Where the controls read and write their query: the page URL, or a stand-in (MemoryUrl). */
type UrlAdapter = { params: URLSearchParams; pathname: string; replace: (href: string) => void; push: (href: string) => void }
const MemoryContext = createContext<UrlAdapter | null>(null)

function useUrl(): UrlAdapter {
  const memory = useContext(MemoryContext)
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  return memory ?? {
    params: new URLSearchParams(params.toString()),
    pathname,
    replace: href => router.replace(href as Route, { scroll: false }),
    push: href => router.push(href as Route),
  }
}

/**
 * A stand-in URL for the controls inside it, shown beneath them: for documentation and tests, where the
 * page's own address must not change. Real pages never use it.
 */
export function MemoryUrl({ initial = '', children }: { initial?: string; children: ReactNode }) {
  const [query, setQuery] = useState(initial)
  const set = (href: string) => setQuery(href.split('?')[1] ?? '')
  return (
    <MemoryContext.Provider value={{ params: new URLSearchParams(query), pathname: '', replace: set, push: set }}>
      {children}
      <p className="mt-3 break-all border-t border-border pt-2 font-mono text-xs text-muted">GET products?{query}</p>
    </MemoryContext.Provider>
  )
}

function useListUrl(meta: ModelMeta) {
  const url = useUrl()
  const [pending, start] = useTransition()
  const state = fromListParams(meta, url.params)
  const write = (patch: Partial<Draft>) => {
    const next = toListParams(meta, { ...state, ...patch }) // no cursor and no page: back to the first page
    start(() => url.replace(`${url.pathname}?${next}`))
  }
  return { state, write, pending }
}

/**
 * Search and typed filters for every field the meta declares (a category contract's facets included),
 * written to the URL. `fields` orders and limits them; counts and relation options come from the page the
 * server just returned.
 */
export function UrlFilters({ meta, fields, counts, options, layout = 'expanded', className }: {
  meta: ModelMeta
  fields?: readonly string[]
  counts?: Record<string, Record<string, number>>
  options?: Record<string, readonly ComboOption[]>
  layout?: 'expanded' | 'collapsed' | 'sheet'
  className?: string
}) {
  const { state, write, pending } = useListUrl(meta)
  const [q, setQ] = useState(state.q)
  const [seen, setSeen] = useState(state.q)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  if (seen !== state.q) { // the URL changed elsewhere (cleared, back button): follow it
    setSeen(state.q)
    setQ(state.q)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  const search = (next: string) => {
    setQ(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => write({ q: next }), SEARCH_PAUSE_MS) // wait for a pause in typing
  }
  return (
    <FiltersBlock meta={meta} fields={fields} values={state.filters} onChange={filters => write({ filters })} search={q} onSearchChange={search}
      layout={layout} counts={counts} options={options} className={cn('motion-reveal transition-opacity', pending && 'opacity-70', className)} />
  )
}

/** "Sort by" over the meta's allow-listed ordering, written to the URL. */
export function UrlSort({ meta, label }: { meta: ModelMeta; label?: string }) {
  const { state, write } = useListUrl(meta)
  const value = state.sort ? `${state.sort.dir === 'desc' ? '-' : ''}${state.sort.key}` : (meta.ordering?.[0] ?? '')
  return <SortSelect meta={meta} label={label} value={value} onChange={v => write({ sort: { key: v.replace(/^-/, ''), dir: v.startsWith('-') ? 'desc' : 'asc' } })} />
}

/** How many records a page shows, written to the URL. */
export function UrlPageSize({ meta, sizes = listPageSizes, label = 'Per page' }: { meta: ModelMeta; sizes?: readonly number[]; label?: string }) {
  const { state, write } = useListUrl(meta)
  const shown = sizes.includes(state.pageSize) ? sizes : [...sizes, state.pageSize].sort((a, b) => a - b)
  return (
    <FormField label={label} className="flex-row items-center gap-2">
      <Select options={shown.map(s => ({ value: String(s), label: String(s) }))} value={String(state.pageSize)} onValueChange={v => write({ pageSize: Number(v) })} className="w-20" />
    </FormField>
  )
}

/**
 * Previous and next from the page's own cursors, through the kernel's Pagination: real links (crawlable,
 * openable in a new tab) that turn the page in place for a reader. The page number travels beside the
 * cursor only to say "Showing 25 to 48"; the cursor decides what is shown, so a stale number is harmless.
 */
export function UrlPager({ page, noun, className }: {
  page: Pick<ListPage, 'next' | 'previous' | 'total' | 'totalCapped' | 'pageSize' | 'results'>
  noun: { one: string; other: string }
  className?: string
}) {
  const { params, pathname, push } = useUrl()
  const n = Math.max(1, Number(params.get(PAGE_PARAM)) || 1)
  const from = page.results.length ? (n - 1) * page.pageSize + 1 : 0
  const href = (cursor: string | null | undefined, at: number) => {
    if (!cursor) return undefined
    const next = new URLSearchParams(params.toString())
    next.delete(listQuery.cursor)
    next.delete(PAGE_PARAM)
    if (at > 1) { // the first page needs no cursor: its address stays clean
      next.set(listQuery.cursor, cursor)
      next.set(PAGE_PARAM, String(at))
    }
    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
  }
  const prevHref = href(page.previous, n - 1)
  const nextHref = href(page.next, n + 1)
  if (!page.results.length) return null
  return (
    <Pagination className={cn('border-t border-border pt-4', className)} from={from} to={from + page.results.length - 1} total={page.totalCapped ? undefined : page.total} noun={noun}
      prevHref={prevHref} nextHref={nextHref} onNavigate={dir => { const to = dir === 'prev' ? prevHref : nextHref; if (to) push(to) }} />
  )
}
