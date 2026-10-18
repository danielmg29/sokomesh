'use client'

// The buyer's comparison selection (SM-F-09): up to four products of one category, picked while browsing
// and compared on /compare. The selection is a per-viewer convenience kept in this browser (it never needs
// the server); the comparison itself is projected by the API from the category contract.

import { Check, GitCompareArrows, X } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Button, buttonStyles } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'

export type ComparePick = { id: string; name: string; category: string; categoryLabel: string }

const KEY = 'sokomesh.compare'
const EVENT = 'sokomesh:compare'
/** The API compares at most four products (apps/catalog COMPARE_LIMIT). */
export const COMPARE_LIMIT = 4
const NONE: readonly ComparePick[] = []

let cachedRaw: string | null = null
let cached: readonly ComparePick[] = NONE

function read(): readonly ComparePick[] {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(KEY)
  } catch {
    return NONE // storage blocked (private window): the selection simply starts empty
  }
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    const list = JSON.parse(raw ?? '[]') as unknown
    cached = Array.isArray(list) ? (list as ComparePick[]).filter(p => typeof p?.id === 'string').slice(0, COMPARE_LIMIT) : NONE
  } catch {
    cached = NONE
  }
  return cached
}

function write(list: readonly ComparePick[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, COMPARE_LIMIT)))
  } catch {
    // storage blocked: nothing to keep, nothing to break
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange) // other tabs
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export type ToggleOutcome = 'added' | 'removed' | 'replaced' | 'full'

/** The selection, and the pure rule for changing it: one category at a time, at most four. */
export function nextSelection(list: readonly ComparePick[], pick: ComparePick): { list: readonly ComparePick[]; outcome: ToggleOutcome } {
  if (list.some(p => p.id === pick.id)) return { list: list.filter(p => p.id !== pick.id), outcome: 'removed' }
  if (list.length && list[0]!.category !== pick.category) return { list: [pick], outcome: 'replaced' }
  if (list.length >= COMPARE_LIMIT) return { list, outcome: 'full' }
  return { list: [...list, pick], outcome: 'added' }
}

export function useCompare() {
  const items = useSyncExternalStore(subscribe, read, () => NONE)
  return {
    items,
    has: (id: string) => items.some(p => p.id === id),
    toggle: (pick: ComparePick) => {
      const next = nextSelection(items, pick)
      if (next.outcome !== 'full') write(next.list)
      return next.outcome
    },
    remove: (id: string) => write(items.filter(p => p.id !== id)),
    clear: () => write([]),
  }
}

export const compareHref = (items: readonly { id: string }[]) => `/compare?products=${items.map(p => p.id).join(',')}` as Route

/** "Compare" on a product cell or page: adds it to, or takes it out of, the selection. */
export function CompareToggle({ product, className }: { product: ComparePick; className?: string }) {
  const { has, toggle, items } = useCompare()
  const toast = useToast()
  const on = has(product.id)
  const press = () => {
    const outcome = toggle(product)
    if (outcome === 'replaced') toast({ tone: 'info', title: 'Comparing a new category', description: `Products are compared within one category, so the earlier picks were cleared for ${product.categoryLabel}.` })
    if (outcome === 'full') toast({ tone: 'warning', title: `Compare up to ${COMPARE_LIMIT} products`, description: 'Take one out of the comparison first.' })
  }
  return (
    <button type="button" aria-pressed={on} onClick={press}
      className={cn('inline-flex min-h-9 items-center gap-2 text-sm font-medium motion-reveal transition-colors', on ? 'text-primary' : 'text-muted hover:text-foreground', className)}>
      <span aria-hidden className={cn('grid size-4 place-items-center border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong bg-surface')}>
        {on ? <Icon icon={Check} className="size-3" /> : null}
      </span>
      {on ? `Comparing (${items.length})` : 'Compare'}
    </button>
  )
}

/** The selection while browsing: a slim bar at the foot of the window once anything is picked (`inline` for documentation). */
export function CompareTray({ inline = false }: { inline?: boolean }) {
  const { items, remove, clear } = useCompare()
  if (!items.length) return inline ? <p className="text-md text-muted">Pick products with Compare to see the tray.</p> : null
  return (
    <>
    {/* Room at the foot of the page, so the bar never covers the last of it. */}
    {inline ? null : <div aria-hidden className="h-24 sm:h-16" />}
    <aside aria-label="Products to compare" className={cn('border-t-2 border-foreground bg-background/95', inline ? 'border-x border-b' : 'fixed inset-x-0 bottom-0 z-30 backdrop-blur-sm animate-reveal')}>
      <div className="mx-auto flex w-full max-w-[96rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-8">
        <p className="text-sm text-muted"><b className="font-semibold text-foreground">{items.length} of {COMPARE_LIMIT}</b> · {items[0]!.categoryLabel}</p>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {items.map(p => (
            <li key={p.id} className="inline-flex max-w-64 items-center gap-1 border border-border bg-surface py-0.5 pr-1 pl-2 text-sm">
              <span className="truncate">{p.name}</span>
              <button type="button" onClick={() => remove(p.id)} aria-label={`Stop comparing ${p.name}`} className="grid size-6 place-items-center text-muted hover:text-foreground"><Icon icon={X} /></button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="md" onClick={clear}>Clear</Button>
          {items.length > 1
            ? <Link href={compareHref(items)} className={buttonStyles({ variant: 'primary', size: 'md' })}><Icon icon={GitCompareArrows} />Compare {items.length}</Link>
            : <span className="text-sm text-muted">Pick one more to compare</span>}
        </div>
      </div>
    </aside>
    </>
  )
}
