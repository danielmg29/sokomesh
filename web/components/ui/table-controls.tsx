'use client'

// Controls every table shares: a search field, facet chips, the toolbar that holds them and the pager.
// They show a query; lib/query.ts runs it, so each table searches, filters and pages the same way.

import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { pageSizes, pageWindow, type QueryResult } from '@/lib/query'
import { Button, IconButton, buttonStyles } from './button'
import { chipStyles } from './chip'
import { FormField } from './form-field'
import { Icon } from './icon'
import { Input } from './input'
import { Select } from './select'

const n = (v: number) => v.toLocaleString('en-KE')

export function TableSearch({ value, onChange, label, placeholder = 'Search…', className }: {
  value: string; onChange: (q: string) => void; label: string; placeholder?: string; className?: string
}) {
  return (
    <div className={cn('min-w-48 flex-1 sm:max-w-sm', className)}>
      <Input type="search" aria-label={label} placeholder={placeholder} prefix={<Icon icon={Search} />} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

export type FacetOption = { value: string; label: ReactNode; count?: number }

/**
 * One facet as toggle chips: none on means any. With counts, each chip says how many rows it would show
 * alongside the other filters, and a chip that would show none is disabled until something else changes.
 */
export function FacetChips({ label, options, value, onChange }: { label: string; options: readonly FacetOption[]; value: readonly string[]; onChange: (next: string[]) => void }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-1.5">
      <span id={id} className="caps mr-1 text-muted">{label}</span>
      {options.map(o => {
        const on = value.includes(o.value)
        return (
          <button key={o.value} type="button" aria-pressed={on} disabled={o.count === 0 && !on}
            onClick={() => onChange(on ? value.filter(v => v !== o.value) : [...value, o.value])}
            className={chipStyles({ on, className: 'disabled:cursor-not-allowed disabled:border-border disabled:text-muted' })}>
            {o.label}{o.count !== undefined ? <span className="font-normal tabular">{n(o.count)}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

/** Search on the left, the clear control and facets beneath; the result count lives in the pager. */
export function TableToolbar({ search, facets, active, onClear, className }: { search: ReactNode; facets?: ReactNode; active?: boolean; onClear?: () => void; className?: string }) {
  return (
    <div role="search" className={cn('flex min-w-0 flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search}
        {active && onClear ? <Button size="sm" variant="ghost" leadingIcon={X} onClick={onClear}>Clear search and filters</Button> : null}
      </div>
      {facets ? <div className="flex flex-wrap items-center gap-x-5 gap-y-2">{facets}</div> : null}
    </div>
  )
}

type PagerProps = {
  result: Pick<QueryResult<unknown>, 'page' | 'pageCount' | 'pageSize' | 'total' | 'from' | 'to'>
  onPage: (page: number) => void
  onPageSize?: (size: number) => void
  noun: { one: string; other: string }
  /** Rows before search and filters, so a filtered count can say what it was taken from. */
  unfiltered?: number
  /**
   * False for keyset pages (a server list): no page numbers, because a page opens only from the cursor
   * of the one before it. `hasNext` then says whether the server returned that cursor.
   */
  numbered?: boolean
  hasNext?: boolean
  /** The server stopped counting at the contract's cap: the total reads "10,000+". */
  totalCapped?: boolean
  /** Rows are loading: the controls stay put and the region says it is busy. */
  busy?: boolean
  className?: string
}

/**
 * Numbered pager for in-memory tables: the range shown (announced politely), rows per page up to the
 * contract's maximum, and previous, numbered and next buttons. Narrow containers keep previous and next
 * with "Page 2 of 7". Crawlable public lists use the cursor `Pagination` links instead.
 */
export function TablePager({ result, onPage, onPageSize, noun, unfiltered, numbered = true, hasNext, totalCapped, busy, className }: PagerProps) {
  const { page, pageCount, pageSize, total, from, to } = result
  const word = total === 1 ? noun.one : noun.other
  const nextOff = hasNext === undefined ? page >= pageCount : !hasNext
  return (
    <nav aria-label={`${noun.other[0]!.toUpperCase()}${noun.other.slice(1)} pages`} aria-busy={busy || undefined} className={cn('@container flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5 text-sm', className)}>
      <p className="text-muted tabular" aria-live="polite">
        {busy && !total ? 'Loading…' : total ? <>Showing <b className="font-semibold text-foreground">{n(from)}</b> to <b className="font-semibold text-foreground">{n(to)}</b> of <b className="font-semibold text-foreground">{n(total)}{totalCapped ? '+' : ''}</b> {word}</> : `No ${noun.other} match`}
        {unfiltered !== undefined && unfiltered !== total ? <>, from {n(unfiltered)}</> : null}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {onPageSize ? (
          <FormField label="Rows per page" className="flex-row items-center gap-2">
            <Select options={pageSizes.map(s => ({ value: String(s), label: String(s) }))} value={String(pageSize)} onValueChange={v => onPageSize(Number(v))} className="h-8 w-20" />
          </FormField>
        ) : null}
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label="Previous page" size="icon-sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} />
          {numbered ? <ol className="hidden items-center gap-1 @lg:flex">
            {pageWindow(page, pageCount).map((p, i) => (
              <li key={p === 'gap' ? `gap-${i}` : p}>
                {p === 'gap' ? <span className="px-1 text-muted" aria-hidden="true">…</span> : (
                  <button type="button" aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}
                    className={cn(buttonStyles({ variant: p === page ? 'primary' : 'ghost', size: 'icon-sm' }), 'min-w-8 px-1.5 tabular')}>
                    {p}
                  </button>
                )}
              </li>
            ))}
          </ol> : null}
          <span className={cn('px-1 text-muted tabular', numbered && '@lg:hidden')}>Page {page}{numbered || !totalCapped ? ` of ${n(pageCount)}` : ''}</span>
          <IconButton icon={ChevronRight} label="Next page" size="icon-sm" variant="secondary" disabled={nextOff} onClick={() => onPage(page + 1)} />
        </div>
      </div>
    </nav>
  )
}
