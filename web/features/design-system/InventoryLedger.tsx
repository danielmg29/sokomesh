'use client'

// Divergent: the design-system reference surface (internal route). Direction contract lives in
// .impeccable/surfaces; components shown here are the real ones used by the app.

import { Boxes, ChevronRight, Grid3X3, Search, X } from 'lucide-react'
import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { CommandPalette } from '@/components/kernel/nav/CommandPalette'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/choice'
import { chipStyles } from '@/components/ui/chip'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { TooltipProvider } from '@/components/ui/overlay'
import { ThemeSwitch } from '@/components/ui/theme'
import { ToastProvider } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { CONTRACT_VERSION } from '@/lib/contract/generated'
import type { Density } from '@/lib/design/tokens.generated'
// Generated with the cut-outs by design/photography/cutout.py; CC BY and CC BY-SA require these credits.
import photoCredits from '@/public/images/products/credits.json'
import { catalogue, chainOf, classes, composedIn, modes, type Entry, type EntryClass, type Mode, type SpecimenModule } from './catalogue'
import { JumpContext } from './kit'

const specimenModules: Record<SpecimenModule, ComponentType<{ code: string }>> = {
  foundations: lazy(() => import('./specimens/foundations')),
  primitives: lazy(() => import('./specimens/primitives')),
  fields: lazy(() => import('./specimens/fields')),
  kernel: lazy(() => import('./specimens/kernel')),
  blocks: lazy(() => import('./specimens/blocks')),
  commerce: lazy(() => import('./specimens/commerce')),
  divergent: lazy(() => import('./specimens/divergent')),
  templates: lazy(() => import('./specimens/templates')),
}

const DEFAULT_OPEN = ['X-08']
type Order = 'composed' | 'build'
const templateCount = catalogue.filter(e => e.cls === 'Template').length
const position = new Map(catalogue.map((e, i) => [e.code, i]))
const byComposed = (a: Entry, b: Entry) => (composedIn.get(b.code) ?? 0) - (composedIn.get(a.code) ?? 0) || position.get(a.code)! - position.get(b.code)!
const defaultDensity = (e: Entry): Density => (e.modes.length === 1 && e.modes[0] !== 'MARKET' ? 'compact' : 'comfortable')

function useLedgerState() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const cls = (params.get('class') as EntryClass | null) ?? null
  const mode = (params.get('mode') as Mode | null) ?? null
  const open = params.has('open') ? (params.get('open') ?? '').split(',').filter(Boolean) : DEFAULT_OPEN
  const order: Order = params.get('order') === 'build' ? 'build' : 'composed'
  // Native history keeps useSearchParams in sync without a navigation (Next.js App Router).
  const write = (next: { q?: string; cls?: EntryClass | null; mode?: Mode | null; open?: string[]; order?: Order }) => {
    const p = new URLSearchParams(params.toString())
    const set = (k: string, v: string | null | undefined) => (v ? p.set(k, v) : p.delete(k))
    if ('q' in next) set('q', next.q)
    if ('cls' in next) set('class', next.cls)
    if ('mode' in next) set('mode', next.mode)
    if ('open' in next) p.set('open', next.open!.join(','))
    if ('order' in next) set('order', next.order === 'build' ? 'build' : null)
    window.history.replaceState(null, '', `?${p.toString()}`)
  }
  return { q, cls, mode, open, order, write }
}

function Masthead({ onJump }: { onJump: (code: string) => void }) {
  return (
    <header className="on-chrome bg-chrome text-chrome-foreground">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <BrandLogo variant="mark" width={28} ground="dark" className="!block" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold">SokoMesh Design System</span>
            <span className="text-sm text-chrome-muted">Contract {CONTRACT_VERSION} · demo data</span>
          </span>
        </div>
        <div className="ml-auto flex w-full items-center gap-3 sm:w-auto sm:flex-1 sm:justify-end">
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <CommandPalette
              triggerLabel="Jump to a component"
              placeholder="Component, widget or state…"
              entries={catalogue.map(e => ({ id: e.code, label: e.name, group: e.cls, hint: e.code, keywords: [...e.states, e.usedIn], onSelect: () => onJump(e.code) }))}
            />
          </div>
          <ThemeSwitch tone="chrome" labels="icon" />
        </div>
      </div>
      <div className="h-1.5 bg-brand" />
    </header>
  )
}

function Tally() {
  const counts = [
    { label: 'components', value: catalogue.filter(e => e.cls !== 'Foundation' && e.cls !== 'Template').length },
    { label: 'field widgets', value: catalogue.filter(e => e.cls === 'Field').length },
    { label: 'divergent', value: catalogue.filter(e => e.cls === 'Divergent' || e.cls === 'Marketing').length },
    { label: 'page templates', value: catalogue.filter(e => e.cls === 'Template').length },
  ]
  return (
    <dl className="grid w-full grid-cols-2 gap-px self-start overflow-hidden lg:w-auto rounded-md border border-border bg-border sm:grid-cols-4">
      {counts.map(c => <div key={c.label} className="flex flex-col bg-surface px-4 py-2.5"><dt className="order-2 text-sm text-muted">{c.label}</dt><dd className="font-display text-2xl font-extrabold tabular">{c.value}</dd></div>)}
    </dl>
  )
}

function ModeMarks({ entry }: { entry: Entry }) {
  return (
    <span className="flex gap-1">
      {modes.map(m => (
        <span key={m} className={cn('w-16 rounded-xs px-1 text-center text-xs font-semibold tracking-caps', entry.modes.includes(m) ? 'border border-border-strong text-foreground' : 'text-border-strong line-through decoration-1')}>
          {m}<span className="sr-only">{entry.modes.includes(m) ? ' applies' : ' does not apply'}</span>
        </span>
      ))}
    </span>
  )
}

function EntryDetail({ entry }: { entry: Entry }) {
  const [density, setDensity] = useState<Density>(defaultDensity(entry))
  const [grid, setGrid] = useState(false)
  const Specimen = specimenModules[entry.module]
  return (
    <div className="@container grid grid-cols-1 gap-6 py-5 @5xl:grid-cols-[17rem_minmax(0,1fr)] animate-reveal">
      <aside className="flex flex-col gap-4 text-md">
        <p className="text-base">{entry.cls === 'Template' ? `Composed from ${chainOf(entry).length} blocks, in the order shown. Every block links to its row.` : entry.summary}</p>
        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted">Class</dt><dd>{entry.cls}{entry.sub ? ` · ${entry.sub}` : ''}</dd>
          <dt className="text-muted">Phase</dt><dd className="tabular">{entry.phase}</dd>
          <dt className="text-muted">Modes</dt><dd><ModeMarks entry={entry} /></dd>
          {entry.source ? <><dt className="text-muted">Driven by</dt><dd><code className="font-mono text-xs break-words">{entry.source}</code></dd></> : null}
          <dt className="text-muted">Used in</dt><dd>{entry.usedIn}</dd>
          <dt className="text-muted">States</dt>
          <dd><ul className="flex flex-wrap gap-1">{entry.states.map(s => <li key={s} className="rounded-xs border border-border bg-sunken px-1.5 text-xs leading-5">{s}</li>)}</ul></dd>
        </dl>
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <Segmented label="Specimen density" size="sm" value={density} onValueChange={setDensity} items={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }]} />
          <Button size="sm" variant={grid ? 'primary' : 'secondary'} leadingIcon={Grid3X3} aria-pressed={grid} onClick={() => setGrid(g => !g)} className="self-start">4 px grid</Button>
        </div>
      </aside>
      <div data-density={density} className="@container relative min-w-0">
        <Suspense fallback={<LoadingState variant="skeleton" shape="block" label={`Loading ${entry.name}`} />}>
          <Specimen code={entry.code} />
        </Suspense>
        {grid ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--tone-danger)_22%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--tone-danger)_22%,transparent)_1px,transparent_1px)] [background-size:var(--space-unit)_var(--space-unit)]" /> : null}
      </div>
    </div>
  )
}

function Ledger() {
  const { q, cls, mode, open, order, write } = useLedgerState()
  const [query, setQuery] = useState(q)
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const hits = catalogue.filter(e =>
      (!cls || e.cls === cls) && (!mode || e.modes.includes(mode)) &&
      (!needle || [e.code, e.name, e.summary, e.usedIn, ...e.states].some(s => s.toLowerCase().includes(needle))))
    return order === 'composed' ? hits.toSorted(byComposed) : hits
  }, [query, cls, mode, order])
  const toggle = (code: string) => write({ open: open.includes(code) ? open.filter(c => c !== code) : [...open, code] })
  const jump = (code: string) => {
    write({ q: '', cls: null, mode: null, open: [...new Set([...open, code])] })
    setQuery('')
    requestAnimationFrame(() => document.getElementById(`row-${code}`)?.scrollIntoView({ block: 'start' }))
  }
  const chip = (on: boolean) => chipStyles({ on, className: 'px-3' })
  const modeChip = (on: boolean) => chipStyles({ on, className: 'px-3 text-xs tracking-caps' })

  return (
    <JumpContext value={jump}>
      <Masthead onJump={jump} />
      <main className="mx-auto flex w-full max-w-[90rem] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="flex max-w-2xl flex-col gap-2">
            <h1 className="font-display text-4xl font-extrabold tracking-display">Component inventory</h1>
            <p className="text-base text-muted">Every component the app projects from the contract, from tokens to page templates, with its class, build phase and modes. Open a row to see it live, in every state the spec names.</p>
          </div>
          <Tally />
        </div>

        <div className="flex flex-col gap-3" role="search">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-80">
              <Input type="search" aria-label="Filter components" placeholder="Filter by name, state or widget…" prefix={<Icon icon={Search} />} value={query} onChange={e => { setQuery(e.target.value); write({ q: e.target.value }) }} />
            </div>
            <span className="text-sm text-muted tabular" aria-live="polite">{rows.length} of {catalogue.length}</span>
            <div className="ml-auto"><Segmented label="Order" size="sm" value={order} onValueChange={v => write({ order: v })} items={[{ value: 'composed', label: 'Most composed' }, { value: 'build', label: 'Build order' }]} /></div>
            {(cls || mode || query) ? <Button size="sm" variant="ghost" leadingIcon={X} onClick={() => { setQuery(''); write({ q: '', cls: null, mode: null }) }}>Clear filters</Button> : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Class">
            <button type="button" aria-pressed={!cls} className={chip(!cls)} onClick={() => write({ cls: null })}>All</button>
            {classes.map(c => <button key={c} type="button" aria-pressed={cls === c} className={chip(cls === c)} onClick={() => write({ cls: cls === c ? null : c })}>{c}</button>)}
            <span className="mx-1 w-px shrink-0 self-stretch bg-border" aria-hidden="true" />
            {modes.map(m => <button key={m} type="button" aria-pressed={mode === m} className={modeChip(mode === m)} onClick={() => write({ mode: mode === m ? null : m })}>{m}</button>)}
          </div>
        </div>

        <div className="@container overflow-clip rounded-md border border-border bg-surface">
          {rows.length === 0 ? (
            <EmptyState kind="no-results" title="No components match" description="Try a component name (CartBlock), a widget (currency) or a state (reserved)." action={<Button variant="secondary" onClick={() => { setQuery(''); write({ q: '', cls: null, mode: null }) }}>Clear filters</Button>} />
          ) : (
            <table className="w-full border-collapse text-md">
              <caption className="sr-only">Component inventory. Each component row has a button that opens its live specimen below it.</caption>
              <thead className="sticky top-0 z-30 bg-sunken">
                <tr className="caps text-left text-muted">
                  <th scope="col" className="w-20 px-3 py-2.5">Code</th>
                  <th scope="col" className="px-3 py-2.5">Component</th>
                  <th scope="col" className="hidden px-3 py-2.5 @2xl:table-cell">Class</th>
                  <th scope="col" className="hidden w-16 px-3 py-2.5 @3xl:table-cell">Phase</th>
                  <th scope="col" className="hidden px-3 py-2.5 @5xl:table-cell">Modes</th>
                  <th scope="col" className="hidden px-3 py-2.5 @4xl:table-cell">States</th>
                  <th scope="col" className="hidden px-3 py-2.5 @6xl:table-cell">Used in</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => {
                  const isOpen = open.includes(e.code)
                  return (
                    <RowGroup key={e.code} entry={e} open={isOpen} onToggle={() => toggle(e.code)} />
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="flex items-center gap-2 text-sm text-muted"><Icon icon={Boxes} />Source: SokoMesh Feature Build Order and Field Specification v1.1, pp. 51 to 58, and the SokoMesh Design Constitution. Organizations, people and figures are demo data.</p>
        <section aria-label="Photography credits" className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted">
          <p><span className="caps mr-2">Photography</span>Product photographs are demo material from Wikimedia Commons, cut out for the theme&apos;s well. They show the goods, not the demo brands.</p>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {photoCredits.map(c => (
              <li key={c.key_name}><a href={c.page} className="underline underline-offset-2 hover:text-foreground">{c.title}</a>, {c.author}, {c.license}</li>
            ))}
          </ul>
        </section>
      </main>
    </JumpContext>
  )
}

function RowGroup({ entry: e, open, onToggle }: { entry: Entry; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr id={`row-${e.code}`} className={cn('scroll-mt-12 border-t border-border align-top', open ? 'bg-primary-soft/60' : 'hover:bg-sunken/60')}>
        <td className="px-3 py-2.5"><code className="font-mono text-sm text-muted">{e.code}</code></td>
        <td className="px-3 py-2">
          <button type="button" aria-expanded={open} aria-controls={`detail-${e.code}`} onClick={onToggle} className="group inline-flex items-center gap-1.5 rounded-xs text-left font-semibold">
            <Icon icon={ChevronRight} className={cn('text-muted motion-reveal transition-transform', open && 'rotate-90 text-primary')} />
            <span className="group-hover:underline">{e.name}</span>
          </button>
          <span className="mt-0.5 block pl-5 text-sm text-muted @2xl:hidden">{e.cls}{e.sub ? ` · ${e.sub}` : ''}</span>
        </td>
        <td className="hidden px-3 py-2.5 @2xl:table-cell"><span className="caps rounded-xs border border-border-strong px-1.5 py-px">{e.cls}</span>{e.sub ? <span className="mt-1 block text-xs text-muted">{e.sub}</span> : null}</td>
        <td className="hidden px-3 py-2.5 text-muted tabular @3xl:table-cell">{e.phase}</td>
        <td className="hidden px-3 py-2.5 @5xl:table-cell"><ModeMarks entry={e} /></td>
        <td className="hidden px-3 py-2.5 text-sm text-muted @4xl:table-cell" title={e.states.join(', ')}><span className="block max-w-72 truncate">{e.states.slice(0, 4).join(', ')}{e.states.length > 4 ? ` +${e.states.length - 4}` : ''}</span></td>
        <td className="hidden px-3 py-2.5 text-sm @6xl:table-cell" title={e.usedIn}>
          <span className="block max-w-56 truncate">{composedIn.get(e.code) ? <span className="font-semibold tabular">{composedIn.get(e.code)} of {templateCount} templates</span> : e.usedIn}</span>
        </td>
      </tr>
      {open ? (
        <tr id={`detail-${e.code}`} className="bg-background">
          <td colSpan={7} className="border-t border-border px-3 sm:px-4">
            <EntryDetail entry={e} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

export function InventoryLedger() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <Ledger />
      </ToastProvider>
    </TooltipProvider>
  )
}
