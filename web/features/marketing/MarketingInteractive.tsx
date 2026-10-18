'use client'

// Divergent marketing islands (spec p.56): header with mobile menu, the market mesh, the
// trade-flow story and the trust proofs. Motion follows the constitution's grammar; reduced
// motion shows every section finished and in place.

import { ArrowRight, Menu as MenuIcon, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button, buttonStyles } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/disclosure'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { StorySplit, cta, type Scene } from './Marketing'

const nav = [
  { label: 'How it works', href: '/#flow' }, { label: 'For sellers', href: '/#value' }, { label: 'Trust', href: '/#trust' },
]

/** Operating terms (PRODUCT.md), not promotions: the strip says how the market works before anyone signs in. */
const terms = ['Prices in KES', 'M-Pesa through SellaPay', 'Times in East Africa Time']

function SearchField({ className }: { className?: string }) {
  return (
    <form role="search" action="#catalogue" className={className} onSubmit={e => e.preventDefault()}>
      <label htmlFor="market-search" className="sr-only">Search the catalogue</label>
      <Input id="market-search" type="search" name="q" prefix={<Icon icon={Search} className="ml-2.5 text-muted" />} placeholder="Search products, SKUs or sellers" />
    </form>
  )
}

/**
 * Public header in three ruled tiers: operating terms, the search-first main row, and the category row
 * (category discovery before marketing). `sticky` pins it; narrow containers move everything into a sheet.
 */
export function MarketingHeader({ emphasis = 'buyer', sticky = false, categories, account, search = true, current, links = nav }: {
  emphasis?: 'buyer' | 'seller'; sticky?: boolean; categories?: readonly { key: string; name: string; href?: string }[]
  /** Replaces the two calls to action, e.g. with the signed-in person's account link. */
  account?: ReactNode
  /** The catalogue search; off until search (SM-F-08) answers it. */
  search?: boolean
  /** Key of the category being shown, marked in the category row; `all` for the whole catalogue. */
  current?: string
  /** The main row's links; defaults to the landing's sections. */
  links?: readonly { label: string; href: string }[]
}) {
  const ctas = account ?? (
    <>
      <a href={cta.sell.href} className={buttonStyles({ variant: emphasis === 'seller' ? 'primary' : 'ghost', size: 'md' })}>{cta.sell.label}</a>
      <a href={cta.buy.href} className={buttonStyles({ variant: emphasis === 'buyer' ? 'primary' : 'secondary', size: 'md' })}>{cta.buy.label}</a>
    </>
  )
  const catHref = (c: { key: string; href?: string }) => c.href ?? `#${c.key}`
  const tab = (on: boolean) => cn('block border-b-2 py-2.5 motion-bind transition-colors', on ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted hover:border-border-strong hover:text-foreground')
  return (
    <header className={cn('@container border-b border-border bg-surface', sticky && 'sticky top-0 z-40')}>
      <div className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-1.5 text-xs text-muted sm:px-6">
        <span className="font-semibold text-foreground">Wholesale ordering for Kenyan retailers</span>
        <ul className="hidden gap-5 @3xl:flex">{terms.map(t => <li key={t}>{t}</li>)}</ul>
      </div>
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="SokoMesh home" className="-ml-3 shrink-0"><BrandLogo variant="wordmark" width={212} /></Link>
        {search ? <SearchField className="hidden max-w-xl min-w-0 flex-1 @3xl:block" /> : null}
        <nav aria-label="Main" className="ml-auto hidden @5xl:block">
          <ul className="flex items-center gap-5 text-md font-medium">{links.map(n => <li key={n.href}><a href={n.href} className="hover:text-primary hover:underline">{n.label}</a></li>)}</ul>
        </nav>
        <div className="ml-auto hidden items-center gap-2 @3xl:flex @5xl:ml-0">{ctas}</div>
        <div className="ml-auto @3xl:hidden">
          <Sheet side="right" title="Menu" trigger={<Button variant="secondary" size="icon" aria-label="Open menu"><Icon icon={MenuIcon} /></Button>}>
            {search ? <SearchField /> : null}
            <nav aria-label="Main" className="mt-4 flex flex-col">{links.map(n => <a key={n.href} href={n.href} className="border-b border-border px-1 py-3 text-lg font-semibold hover:bg-sunken">{n.label}</a>)}</nav>
            {categories?.length ? (
              <nav aria-label="Categories" className="mt-4 flex flex-col">
                <span className="caps px-1 pb-1 text-muted">Categories</span>
                {categories.map(c => <a key={c.key} href={catHref(c)} aria-current={current === c.key ? 'page' : undefined} className="border-b border-border px-1 py-2.5 hover:bg-sunken aria-[current=page]:font-semibold">{c.name}</a>)}
              </nav>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">{ctas}</div>
          </Sheet>
        </div>
      </div>
      {categories?.length ? (
        <nav aria-label="Categories" className="hidden border-t border-border @3xl:block">
          <ul className="flex gap-6 overflow-x-auto px-6 text-md">
            <li className="shrink-0"><a href={cta.browse.href} aria-current={current === 'all' ? 'page' : undefined} className={tab(current === undefined || current === 'all')}>{cta.browse.label}</a></li>
            {categories.map(c => <li key={c.key} className="shrink-0"><a href={catHref(c)} aria-current={current === c.key ? 'page' : undefined} className={tab(current === c.key)}>{c.name}</a></li>)}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}

/** One entry in the product's record. `change` moves availability; entries without one only describe it. */
export type MeshEntry = { label: string; reference?: string; detail: string; at: string; change?: number; available: number }
/** A part of the market: who it is, how many there are, and the entry it writes into the record. */
export type MeshStation = { key: string; label: string; figure: string; role: string; entry: MeshEntry }
/** One product's record. Stations are listed in the order their entries were written. */
export type MeshRecord = {
  product: { name: string; listing: string; image: { src: string; width: number; height: number } }
  unit: string
  stations: readonly MeshStation[]
}

const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`)
const pad = 'px-6 @xl:px-10'
// Row cells meet at the seam with no padding there, so each row's rule and lit band run straight across.
const seamRight = 'px-3 @xl:px-7 @4xl:pl-0'
const seamRightInner = 'px-3 @4xl:pl-10'
// Below the small width the record drops the running balance; the large figure and the sum still carry it.
const ledgerCols = 'grid-cols-[minmax(0,1fr)_4.5rem] @xl:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem]'

/**
 * The mesh: one product's record with every part of the market writing into it. The parts sit on the light
 * ground, the record on the chrome ground, and each part shares a row with the entry it wrote, so the rules
 * run straight across the seam: the thread is the grid itself. Availability is set large and the record
 * closes on its own arithmetic. Choosing a part lights its row on both sides (BIND); rows rise in once as
 * they scroll into view (REVEAL). Static and reduced motion show the finished record. Below the two-column
 * width the record stands alone and each entry names its part.
 */
export function MarketMeshVisualization({ record, mode = 'animated' }: { record: MeshRecord; mode?: 'animated' | 'static' | 'reduced-motion' }) {
  const [active, setActive] = useState<string | null>(null)
  const bind = mode === 'reduced-motion' ? undefined : 'motion-bind transition-[background-color,color,opacity]'
  const entries = record.stations.map(s => s.entry)
  const available = entries.at(-1)?.available ?? 0
  const added = entries.reduce((n, e) => n + Math.max(e.change ?? 0, 0), 0)
  const taken = entries.reduce((n, e) => n + Math.max(-(e.change ?? 0), 0), 0)
  const sum = 'Every entry is kept, and availability is their sum. Demo data.'
  return (
    <section className="@container" aria-labelledby="mesh-heading">
      <div className="grid grid-cols-1 border border-border @4xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className={cn('flex flex-col justify-end gap-4 bg-surface pt-8 pb-8 @xl:pt-10', pad)}>
          <h2 id="mesh-heading" className="max-w-[16ch] text-3xl font-semibold @5xl:text-4xl">One record between seller and buyer</h2>
          <p className="max-w-[44ch] text-lg text-muted">Catalogue, stock and orders share one ledger, so a buyer orders against the figure the seller&apos;s store sees.</p>
        </div>
        <div className={cn('on-chrome flex min-w-0 flex-col gap-6 bg-chrome pt-8 pb-6 text-chrome-foreground @xl:pt-10', pad)}>
          <div className="flex items-center gap-4">
            <span className="relative block size-20 shrink-0 bg-well @xl:size-24">
              <Image src={record.product.image.src} alt="" fill sizes="96px" className="object-contain p-2" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="caps text-chrome-muted">The record</span>
              <span id="mesh-record-title" className="text-xl font-semibold">{record.product.name}</span>
              <span className="text-sm text-chrome-muted">{record.product.listing}</span>
            </span>
          </div>
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-statement font-extrabold tracking-display tabular">{available}</span>
            <span className="text-lg">{record.unit}s available to order</span>
          </p>
        </div>

        <div className="hidden flex-col justify-end bg-surface pl-7 @4xl:flex">
          <p id="mesh-hint" className="border-b border-border-strong px-3 pr-10 pb-2 text-sm text-muted">Choose a part of the market to light the entry it wrote.</p>
        </div>
        <div aria-hidden="true" className={cn('on-chrome bg-chrome text-chrome-muted', seamRight)}>
          <div className={cn('grid gap-x-3 border-b border-chrome-muted/40 py-2', ledgerCols, seamRightInner)}>
            <span className="caps">Entry</span><span className="caps text-right">Change</span><span className="caps hidden text-right @xl:block">Available</span>
          </div>
        </div>

        <ol id="mesh-record" role="list" aria-labelledby="mesh-record-title" className="contents">
          {record.stations.map(s => {
            const on = active === s.key
            const e = s.entry
            return (
              <li key={s.key} aria-current={on ? 'true' : undefined} className={cn('grid grid-cols-1 @4xl:col-span-2 @4xl:grid-cols-subgrid', mode === 'animated' && 'scroll-reveal')}>
                <div className="hidden bg-surface pl-7 @4xl:block">
                  <button type="button" aria-pressed={on} aria-describedby="mesh-hint" onClick={() => setActive(on ? null : s.key)}
                    className={cn('grid h-full w-full grid-cols-[minmax(0,1fr)_auto] content-start items-baseline gap-x-4 gap-y-0.5 border-b border-border py-3.5 pr-10 pl-3 text-left', bind, on ? 'bg-signal-soft' : 'hover:bg-sunken')}>
                    <span className="font-display text-xl font-semibold">{s.label}</span>
                    <span className={cn('text-sm tabular', on ? 'font-semibold text-foreground' : 'text-muted')}>{s.figure}</span>
                    <span className="col-span-2 text-md text-muted">{s.role}</span>
                  </button>
                </div>
                <div className={cn('on-chrome bg-chrome text-chrome-foreground', seamRight)}>
                  <div className={cn('grid h-full gap-x-3 border-b border-chrome-muted/25 py-3.5', ledgerCols, seamRightInner, bind, on && 'bg-chrome-foreground/10', active && !on && 'opacity-55')}>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn('caps', on ? 'text-signal' : 'text-chrome-muted')}>{s.label}</span>
                      <span className="font-semibold">{e.label}{e.reference ? <span className="ml-2 font-mono text-sm font-normal whitespace-nowrap text-chrome-muted">{e.reference}</span> : null}</span>
                      <span className="text-sm text-chrome-muted">{e.detail}, <time>{e.at}</time></span>
                    </div>
                    <p className="text-right font-display text-lg font-bold whitespace-nowrap tabular">
                      <span className="sr-only">Change: </span>
                      {e.change ? signed(e.change) : <><span aria-hidden="true" className="text-chrome-muted">&ndash;</span><span className="sr-only">none</span></>}
                    </p>
                    <p className="hidden text-right text-lg tabular @xl:block"><span className="sr-only">Available: </span>{e.available}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <p className={cn('hidden bg-surface pt-4 pb-8 text-sm text-muted @4xl:block @xl:pb-10', pad)}>{sum}</p>
        <div className={cn('on-chrome flex flex-col gap-2 bg-chrome pt-4 pb-8 text-chrome-foreground @xl:pb-10', pad)}>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-2xl font-extrabold tabular @xl:text-3xl">
            <span>{added} <span className="font-sans text-sm font-normal text-chrome-muted">in</span></span>
            <span aria-hidden="true" className="text-chrome-muted">&minus;</span><span className="sr-only">minus</span>
            <span>{taken} <span className="font-sans text-sm font-normal text-chrome-muted">out</span></span>
            <span aria-hidden="true" className="text-chrome-muted">=</span><span className="sr-only">equals</span>
            <span className="text-signal">{available} <span className="font-sans text-sm font-normal text-chrome-muted">available</span></span>
          </p>
          <p className="text-sm text-chrome-muted @4xl:hidden">{sum}</p>
        </div>
      </div>
    </section>
  )
}

/**
 * Value for both sides of the market: tabs (narrow), a split (wide), or `stories`, two photographic story
 * panels with the photograph left then right, so each side of the market gets its own scene.
 */
export function BuyerSellerValueSplit({ layout = 'split', buyer, seller, scenes }: {
  layout?: 'split' | 'tabs' | 'stories'; buyer: readonly { title: string; body: string }[]; seller: readonly { title: string; body: string }[]
  scenes?: { buyer: Scene; seller: Scene }
}) {
  if (layout === 'stories' && scenes) {
    return (
      <div id="value" className="flex flex-col gap-8">
        <StorySplit scene={scenes.buyer} title="For buyers: your restock, in one order" body="Retail shops order from several wholesalers at once and see the real stock, the real price and the delivery day before they commit." items={buyer} link={cta.buy} />
        <StorySplit scene={scenes.seller} side="right" title="For sellers: one ledger behind every sale" body="Wholesalers publish once against the category contract and sell to every approved buyer from the same stock record." items={seller} link={cta.sell} />
      </div>
    )
  }
  const list = (items: readonly { title: string; body: string }[]) => (
    <ul className="flex flex-col divide-y divide-border">
      {items.map(i => <li key={i.title} className="flex flex-col gap-1 py-4 first:pt-0"><span className="text-lg font-semibold">{i.title}</span><span className="text-md text-muted">{i.body}</span></li>)}
    </ul>
  )
  if (layout === 'tabs') {
    return (
      <Tabs defaultValue="buyer" id="value">
        <TabsList variant="boxed"><TabsTrigger value="buyer">For buyers</TabsTrigger><TabsTrigger value="seller">For sellers</TabsTrigger></TabsList>
        <TabsContent value="buyer">{list(buyer)}</TabsContent>
        <TabsContent value="seller">{list(seller)}</TabsContent>
      </Tabs>
    )
  }
  return (
    <section id="value" className="@container" aria-label="What each side gets">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border @2xl:grid-cols-2">
        <div className="flex flex-col gap-4 bg-surface p-6"><h2 className="text-2xl font-semibold">For buyers</h2>{list(buyer)}</div>
        <div className="flex flex-col gap-4 bg-sunken p-6"><h2 className="text-2xl font-semibold">For sellers</h2>{list(seller)}</div>
      </div>
    </section>
  )
}

export type FlowStep = { key: 'discover' | 'compare' | 'order' | 'fulfil'; title: string; body: string; example: ReactNode }

/**
 * Discover → compare → order → fulfil, each step carrying a real component as its example. The steps read as
 * one ruled thread: steps behind the current one carry the primary rule, the current one the signal rule
 * (THREAD); the example stands on the well beside the step's argument and moves in when it changes (TRANSFER).
 */
export function TradeFlowStory({ steps }: { steps: readonly FlowStep[] }) {
  const [active, setActive] = useState(steps[0]!.key)
  const index = Math.max(0, steps.findIndex(s => s.key === active))
  const current = steps[index]!
  const next = steps[index + 1]
  return (
    <section id="flow" className="@container flex flex-col gap-8" aria-labelledby="flow-title">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <h2 id="flow-title" className="text-3xl font-semibold @5xl:text-4xl">From search to delivery</h2>
        <p className="max-w-[44ch] text-lg text-muted">Four steps, each shown with the part of SokoMesh a buyer or seller uses for it.</p>
      </div>
      <ol className="grid grid-cols-2 gap-x-4 @3xl:grid-cols-4" aria-label="Steps">
        {steps.map((s, i) => {
          const on = i === index
          return (
            <li key={s.key}>
              <button type="button" aria-pressed={on} aria-controls="flow-panel" onClick={() => setActive(s.key)}
                className={cn('group flex w-full flex-col gap-1 border-t-2 pt-4 pb-5 text-left motion-thread transition-[border-color,color] active:translate-y-px',
                  on ? 'border-signal' : i < index ? 'border-primary' : 'border-border-strong hover:border-foreground')}>
                <span className={cn('font-display text-4xl font-extrabold tabular @5xl:text-5xl', on ? 'text-foreground' : 'text-muted group-hover:text-foreground')}>{String(i + 1).padStart(2, '0')}</span>
                <span className="text-lg font-semibold">{s.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <div id="flow-panel" key={current.key} aria-live="polite" className="grid min-w-0 animate-transfer grid-cols-1 border border-border @4xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col justify-center gap-4 bg-surface p-6 @xl:p-10">
          <span className="caps text-muted">Step {index + 1} of {steps.length}</span>
          <h3 className="text-2xl font-semibold @5xl:text-3xl">{current.title}</h3>
          <p className="max-w-[38ch] text-lg text-muted">{current.body}</p>
          {next ? (
            <button type="button" onClick={() => setActive(next.key)} className="mt-2 inline-flex items-center gap-1 self-start text-md font-semibold text-primary hover:underline">
              Next: {next.title}<Icon icon={ArrowRight} />
            </button>
          ) : null}
        </div>
        <div className="grid min-h-72 min-w-0 grid-cols-[minmax(0,1fr)] place-items-center bg-well p-4 @xl:p-10"><div className="w-full max-w-md">{current.example}</div></div>
      </div>
    </section>
  )
}

const proofOrder = ['stock', 'reservation', 'payment'] as const
const proofLabel = { stock: 'Stock', reservation: 'Reservation', payment: 'Payment' } as const

/**
 * Proofs of the three hard guarantees: stock is derivable, holds are bounded, payment applies once. The
 * argument holds its place on the left while the proofs scroll past on the right (after Not Another Bill's
 * two-column product page), each proof standing on the well with the component that enforces it.
 */
export function InventoryTrustProof({ proofs }: { proofs: Record<(typeof proofOrder)[number], { title: string; body: string; example: ReactNode }> }) {
  return (
    <section id="trust" className="@container" aria-labelledby="trust-title">
      <div className="grid grid-cols-1 gap-x-14 gap-y-8 @4xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-4 @4xl:sticky @4xl:top-8 @4xl:self-start">
          <h2 id="trust-title" className="max-w-[16ch] text-3xl font-semibold @5xl:text-4xl">Two buyers, the last 24 bales, one outcome</h2>
          <p className="max-w-[40ch] text-lg text-muted">Three guarantees keep the record true. Each is shown working, in the part of SokoMesh that enforces it.</p>
          <nav aria-label="Guarantees" className="hidden @4xl:block">
            <ul className="mt-4 flex flex-col border-t border-border">
              {proofOrder.map(k => (
                <li key={k} className="border-b border-border">
                  <a href={`#trust-${k}`} className="flex flex-col gap-0.5 py-3 hover:text-primary">
                    <span className="font-semibold">{proofLabel[k]}</span><span className="text-sm text-muted">{proofs[k].title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <ol className="flex flex-col">
          {proofOrder.map(k => (
            <li key={k} id={`trust-${k}`} className="flex scroll-mt-8 flex-col gap-5 border-t border-foreground pt-5 pb-12 last:pb-0">
              <div className="flex flex-col gap-2">
                <span className="caps text-primary">{proofLabel[k]}</span>
                <h3 className="max-w-[28ch] text-2xl font-semibold">{proofs[k].title}</h3>
                <p className="max-w-[52ch] text-md text-muted">{proofs[k].body}</p>
              </div>
              <div className="min-w-0 bg-well p-4 @xl:p-6">{proofs[k].example}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
