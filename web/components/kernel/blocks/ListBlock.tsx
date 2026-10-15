'use client'

import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/choice'
import type { ComboOption } from '@/components/ui/combobox'
import { Icon } from '@/components/ui/icon'
import { ScrollArea, TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { TablePager } from '@/components/ui/table-controls'
import { useTableQuery } from '@/lib/client/use-table-query'
import { cn } from '@/lib/cn'
import { limits } from '@/lib/contract/generated'
import type { FieldMeta, ModelMeta, Rec } from '@/lib/contract/types'
import type { Density } from '@/lib/design/tokens.generated'
import { clientFilterable, recordAccess } from '@/lib/query'
import { Projection } from '../Projection'
import { ActionMenu, type RunAction } from '../actions/ActionBar'
import { EmptyState, type EmptyKind } from '../feedback/EmptyState'
import { ErrorState } from '../feedback/ErrorState'
import { LoadingState } from '../feedback/LoadingState'
import { FieldView } from '../fields/FieldView'
import { rendererFor } from '../fields/registry'
import { asRelation } from '../fields/types'
import { FiltersBlock } from './FiltersBlock'

export type ListState = 'ready' | 'loading' | 'empty' | 'error' | 'stale'
export type NarrowStrategy = 'scroll' | 'collapse' | 'priority'

type Props = {
  meta: ModelMeta
  records: readonly Rec[]
  intent?: 'row' | 'card'
  density?: Density
  narrow?: NarrowStrategy
  state?: ListState
  /** Live updates since the last render, announced politely and offered as a refresh. */
  live?: { changed: number; onApply: () => void }
  staleSince?: ReactNode
  onRefresh?: () => void
  selectable?: boolean
  selected?: readonly string[]
  onSelectedChange?: (ids: string[]) => void
  onRun?: RunAction
  href?: (r: Rec) => string
  sort?: { field: string; dir: 'asc' | 'desc' }
  onSortChange?: (s: { field: string; dir: 'asc' | 'desc' }) => void
  empty?: { kind: EmptyKind; title: string; description?: ReactNode; action?: ReactNode }
  errorCode?: string
  onRetry?: () => void
  /** Cursor pagination: next page exists. */
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  now?: string
  /** Extra per-record region (e.g. stock indicator) for card intent. */
  extra?: (r: Rec) => ReactNode
  caption?: string
  /**
   * `client` (default for tables): search over `meta.search`, filters for every field declaring filter
   * operators, sorting over `meta.ordering` and numbered pages, all live over the records given. `none`
   * renders the records as given, for callers that query the server themselves.
   */
  query?: 'client' | 'none'
}

/** Widgets whose filter is a finite choice list, so live facet counts make sense. */
const CHOICE_WIDGETS = new Set(['select', 'status', 'multiselect', 'unit'])

/** Priority strategy: the first three columns always show; later ones appear as the container widens. */
const priorityClass = (i: number) => (i < 2 ? '' : i < 3 ? 'hidden @md:table-cell' : i < 5 ? 'hidden @2xl:table-cell' : 'hidden @5xl:table-cell')

export function ListBlock(props: Props) {
  const {
    meta, records, intent = 'row', density = 'comfortable', narrow = 'scroll', state = 'ready', live, staleSince, onRefresh,
    selectable, selected = [], onSelectedChange, onRun, href, sort, onSortChange, empty, errorCode, onRetry, hasMore, onLoadMore, loadingMore, now, extra, caption,
    query = intent === 'row' ? 'client' : 'none',
  } = props
  const client = query === 'client'
  const access = useMemo(() => recordAccess(meta), [meta])
  const t = useTableQuery(records, access, { pageSize: Math.min(meta.list.defaultPageSize, meta.list.maxPageSize), sort: sort ? { key: sort.field, dir: sort.dir } : undefined })
  const shown = client ? t.result.rows : records
  const filterable = clientFilterable(meta)
  const activeSort = client ? t.query.sort : sort ? { key: sort.field, dir: sort.dir } : undefined
  const byName = new Map(meta.fields.map(f => [f.name, f]))
  const columns = meta.list.fields.map(n => byName.get(n)).filter((f): f is FieldMeta => Boolean(f))
  const maxSelect = limits.maxBulk
  const allSelected = shown.length > 0 && shown.every(r => selected.includes(r.id))
  const someSelected = shown.some(r => selected.includes(r.id))
  const toggle = (id: string) => onSelectedChange?.(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id].slice(0, maxSelect))
  const toggleAll = () => onSelectedChange?.(allSelected ? selected.filter(id => !shown.some(r => r.id === id)) : [...new Set([...selected, ...shown.map(r => r.id)])].slice(0, maxSelect))
  const label = (meta.labelPlural ?? meta.label).toLowerCase()
  const noun = { one: meta.label.toLowerCase(), other: label }
  const changeSort = (field: string) => {
    const dir = activeSort?.key === field && activeSort.dir === 'desc' ? 'asc' : 'desc'
    t.setSort({ key: field, dir })
    onSortChange?.({ field, dir })
  }

  if (state === 'loading') return <LoadingState variant="skeleton" shape={intent === 'card' ? 'cards' : 'list'} rows={intent === 'card' ? 8 : 5} label={`Loading ${label}`} />
  if (state === 'error') return <ErrorState code={errorCode ?? 'UNAVAILABLE'} onRetry={onRetry} />
  if (state === 'empty' || records.length === 0) {
    return <div className="rounded-md border border-border bg-surface"><EmptyState kind={empty?.kind ?? 'no-data'} title={empty?.title ?? `No ${label} yet`} description={empty?.description} action={empty?.action} /></div>
  }

  // Relation filters choose among the records' own counterparties; choice filters carry live counts.
  const relationOptions: Record<string, ComboOption[]> = {}
  const counts: Record<string, Record<string, number>> = {}
  for (const f of filterable) {
    if (f.widget === 'relation') {
      const seen = new Map<string, string>()
      for (const r of records) { const v = asRelation(r[f.name]); if (v) seen.set(v.id, v.label) }
      relationOptions[f.name] = [...seen].map(([value, l]) => ({ value, label: l })).sort((a, b) => a.label.localeCompare(b.label))
    } else if (CHOICE_WIDGETS.has(f.widget)) counts[f.name] = t.counts(f.name)
  }
  const toolbar = client && (meta.search?.length || filterable.length) ? (
    <FiltersBlock meta={meta} layout="collapsed" fields={filterable.map(f => f.name)} values={t.query.filters} onChange={t.setFilters}
      search={t.query.q} onSearchChange={t.setSearch} counts={counts} options={relationOptions} />
  ) : null
  const noMatch = client && t.result.total === 0 ? (
    <EmptyState kind="no-results" title={`No ${label} match`} description="Try fewer words or remove a filter."
      action={<Button variant="secondary" onClick={t.clear}>Clear search and filters</Button>} />
  ) : null

  const notices = (
    <>
      <div aria-live="polite" className="sr-only">{live?.changed ? `${live.changed} ${live.changed === 1 ? meta.label.toLowerCase() : label} updated` : ''}</div>
      {live?.changed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-tone-info bg-tone-info-bg/60 px-3 py-2 text-md">
          <span><b className="font-semibold tabular">{live.changed}</b> {live.changed === 1 ? meta.label.toLowerCase() : label} changed since you opened this list.</span>
          <Button size="sm" variant="secondary" leadingIcon={RefreshCw} onClick={live.onApply}>Show changes</Button>
        </div>
      ) : null}
      {state === 'stale' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-tone-warning bg-tone-warning-bg/60 px-3 py-2 text-md">
          <span>Prices and stock may have changed. {staleSince}</span>
          {onRefresh ? <Button size="sm" variant="secondary" leadingIcon={RefreshCw} onClick={onRefresh}>Refresh</Button> : null}
        </div>
      ) : null}
    </>
  )

  const loadMore = hasMore || loadingMore ? (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-3 text-md text-muted">
      <span className="tabular">{client ? `${records.length.toLocaleString('en-KE')} ${label} loaded` : `Showing ${records.length.toLocaleString('en-KE')} ${label}`}</span>
      <Button variant="secondary" size="sm" loading={loadingMore} loadingLabel="Loading…" onClick={onLoadMore}>Load {Math.min(meta.list.defaultPageSize, meta.list.maxPageSize)} more</Button>
    </div>
  ) : null
  const more = client ? (
    <>
      <TablePager result={t.result} onPage={t.setPage} onPageSize={t.setPageSize} noun={noun} unfiltered={records.length} className="border-t border-border" />
      {loadMore}
    </>
  ) : loadMore ?? <p className="border-t border-border px-3 py-3 text-md text-muted tabular">All {records.length.toLocaleString('en-KE')} {label} shown</p>

  if (intent === 'card') {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {notices}
        {toolbar}
        {noMatch ? <div className="rounded-md border border-border bg-surface">{noMatch}</div> : (
        <div className="@container">
          {/* One container, not floating cards: cells share a rule, and a short last row leaves open ground. */}
          <ul className="grid grid-cols-1 border-t border-l border-border @sm:grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-4">
            {shown.map(r => (
              <li key={r.id} className={cn('flex border-r border-b border-border bg-surface', selected.includes(r.id) && 'relative z-10 ring-2 ring-primary ring-inset')}>
                <Projection meta={meta} record={r} context="list" pref={{ density }} override={{ intent: meta.fields.some(f => f.widget === 'image') ? 'media' : 'card', surface: 'flat' }} onRun={onRun} href={href?.(r)} now={now} extra={extra?.(r)} className="w-full" />
              </li>
            ))}
          </ul>
        </div>
        )}
        <div className="rounded-md border border-border bg-surface [&>:first-child]:border-t-0">{more}</div>
      </div>
    )
  }

  const table = (
    <Table caption={caption ?? meta.labelPlural}>
      <THead sticky>
        <tr>
          {selectable ? (
            <Th className="w-10"><Checkbox aria-label={allSelected ? 'Clear selection on this page' : `Select all ${shown.length} on this page`} checked={allSelected ? true : someSelected ? 'indeterminate' : false} onCheckedChange={toggleAll} /></Th>
          ) : null}
          {columns.map((f, i) => {
            const numeric = rendererFor(f.widget)?.align === 'end'
            const sortable = (client || onSortChange) && meta.ordering?.some(o => o.replace('-', '') === f.name)
            const active = activeSort?.key === f.name
            return (
              <Th key={f.name} numeric={numeric} className={cn(narrow === 'priority' && priorityClass(i))} aria-sort={active ? (activeSort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {sortable ? (
                  <button type="button" className={cn('inline-flex items-center gap-1 uppercase hover:text-foreground', active && 'text-foreground')} onClick={() => changeSort(f.name)}>
                    {f.label}{active ? <Icon icon={activeSort!.dir === 'asc' ? ArrowUp : ArrowDown} /> : null}
                  </button>
                ) : f.label}
              </Th>
            )
          })}
          {onRun ? <Th className="w-12"><span className="sr-only">Actions</span></Th> : null}
        </tr>
      </THead>
      <TBody>
        {shown.map(r => (
          <Tr key={r.id} interactive selected={selected.includes(r.id)}>
            {selectable ? <Td><Checkbox aria-label={`Select ${String(r[meta.displayField ?? 'id'])}`} checked={selected.includes(r.id)} onCheckedChange={() => toggle(r.id)} /></Td> : null}
            {columns.map((f, i) => (
              <Td key={f.name} numeric={rendererFor(f.widget)?.align === 'end'} className={cn('max-w-72', narrow === 'priority' && priorityClass(i))}>
                {i === 0 && href ? <a href={href(r)} className="font-semibold text-foreground hover:underline"><FieldView field={f} value={r[f.name]} context="compact" now={now} /></a>
                  : <FieldView field={f} value={r[f.name]} context="compact" now={now} />}
              </Td>
            ))}
            {onRun ? <Td><ActionMenu meta={meta} record={r} onRun={onRun} density="compact" /></Td> : null}
          </Tr>
        ))}
      </TBody>
    </Table>
  )

  return (
    <div data-density={density} className="flex min-w-0 flex-col gap-3">
      {notices}
      {toolbar}
      <div className="@container overflow-hidden rounded-md border border-border bg-surface">
        {noMatch ?? <>
        {narrow === 'scroll' ? <ScrollArea label={`${meta.labelPlural} table, scrolls sideways`}>{table}</ScrollArea> : null}
        {/* Priority drops low-rank columns first; if the primary ones still do not fit, it scrolls. */}
        {narrow === 'priority' ? <ScrollArea label={`${meta.labelPlural} table`}>{table}</ScrollArea> : null}
        {narrow === 'collapse' ? (
          <>
            <div className="hidden @3xl:block">{table}</div>
            <ul className="flex flex-col divide-y divide-border @3xl:hidden">
              {shown.map(r => (
                <li key={r.id}><Projection meta={meta} record={r} context="list" override={{ intent: 'row', surface: 'flat', density: 'compact' }} onRun={onRun} href={href?.(r)} now={now} className="rounded-none" /></li>
              ))}
            </ul>
          </>
        ) : null}
        </>}
        {more}
      </div>
    </div>
  )
}
