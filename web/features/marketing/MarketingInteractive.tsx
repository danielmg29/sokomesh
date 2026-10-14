'use client'

// Divergent marketing islands (spec p.56): header with mobile menu, the market mesh, the
// trade-flow story and the trust proofs. Motion follows the constitution's grammar and the
// mesh draws once (THREAD); reduced motion shows the finished drawing.

import { Menu as MenuIcon, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button, buttonStyles } from '@/components/ui/button'
import { Segmented } from '@/components/ui/choice'
import { Sheet } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/disclosure'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { cta } from './Marketing'

const nav = [
  { label: 'How it works', href: '#flow' }, { label: 'For sellers', href: '#value' }, { label: 'Trust', href: '#trust' },
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
export function MarketingHeader({ emphasis = 'buyer', sticky = false, categories }: {
  emphasis?: 'buyer' | 'seller'; sticky?: boolean; categories?: readonly { key: string; name: string }[]
}) {
  const ctas = (
    <>
      <a href={cta.sell.href} className={buttonStyles({ variant: emphasis === 'seller' ? 'primary' : 'ghost', size: 'md' })}>{cta.sell.label}</a>
      <a href={cta.buy.href} className={buttonStyles({ variant: emphasis === 'buyer' ? 'primary' : 'secondary', size: 'md' })}>{cta.buy.label}</a>
    </>
  )
  return (
    <header className={cn('@container border-b border-border bg-surface', sticky && 'sticky top-0 z-40')}>
      <div className="on-chrome flex items-center justify-between gap-4 bg-chrome px-4 py-1.5 text-xs text-chrome-muted sm:px-6">
        <span className="text-chrome-foreground">Wholesale ordering for Kenyan retailers</span>
        <ul className="hidden gap-5 @3xl:flex">{terms.map(t => <li key={t}>{t}</li>)}</ul>
      </div>
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        <a href="#top" aria-label="SokoMesh home" className="-ml-3 shrink-0"><BrandLogo variant="lockup" width={168} /></a>
        <SearchField className="hidden max-w-xl min-w-0 flex-1 @3xl:block" />
        <nav aria-label="Main" className="ml-auto hidden @5xl:block">
          <ul className="flex items-center gap-5 text-md font-medium">{nav.map(n => <li key={n.href}><a href={n.href} className="hover:text-primary hover:underline">{n.label}</a></li>)}</ul>
        </nav>
        <div className="ml-auto hidden items-center gap-2 @3xl:flex @5xl:ml-0">{ctas}</div>
        <div className="ml-auto @3xl:hidden">
          <Sheet side="right" title="Menu" trigger={<Button variant="secondary" size="icon" aria-label="Open menu"><Icon icon={MenuIcon} /></Button>}>
            <SearchField />
            <nav aria-label="Main" className="mt-4 flex flex-col">{nav.map(n => <a key={n.href} href={n.href} className="border-b border-border px-1 py-3 text-lg font-semibold hover:bg-sunken">{n.label}</a>)}</nav>
            {categories?.length ? (
              <nav aria-label="Categories" className="mt-4 flex flex-col">
                <span className="caps px-1 pb-1 text-muted">Categories</span>
                {categories.map(c => <a key={c.key} href={`#${c.key}`} className="border-b border-border px-1 py-2.5 hover:bg-sunken">{c.name}</a>)}
              </nav>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">{ctas}</div>
          </Sheet>
        </div>
      </div>
      {categories?.length ? (
        <nav aria-label="Categories" className="hidden border-t border-border @3xl:block">
          <ul className="flex gap-6 overflow-x-auto px-6 text-md">
            <li><a href={cta.browse.href} className="block border-b-2 border-foreground py-2.5 font-semibold">{cta.browse.label}</a></li>
            {categories.map(c => <li key={c.key} className="shrink-0"><a href={`#${c.key}`} className="block border-b-2 border-transparent py-2.5 text-muted motion-bind transition-colors hover:border-border-strong hover:text-foreground">{c.name}</a></li>)}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}

type Node = { id: string; label: string; detail: string; x: number; y: number; tone: 'primary' | 'signal' | 'ink' }
const nodes: Node[] = [
  { id: 'sellers', label: 'Sellers', detail: '4 wholesalers', x: 70, y: 70, tone: 'primary' },
  { id: 'catalogue', label: 'Catalogue', detail: '2 category contracts', x: 70, y: 230, tone: 'primary' },
  { id: 'stock', label: 'Stock ledger', detail: 'every movement kept', x: 300, y: 150, tone: 'ink' },
  { id: 'buyers', label: 'Buyers', detail: '2 retail shops', x: 530, y: 70, tone: 'signal' },
  { id: 'orders', label: 'Orders', detail: 'one change per event', x: 530, y: 230, tone: 'signal' },
  { id: 'fulfilment', label: 'Fulfilment', detail: 'pick · pack · hand over', x: 300, y: 300, tone: 'ink' },
]
const links: [string, string][] = [['sellers', 'catalogue'], ['catalogue', 'stock'], ['sellers', 'stock'], ['stock', 'buyers'], ['buyers', 'orders'], ['stock', 'orders'], ['orders', 'fulfilment'], ['fulfilment', 'stock']]

/** The mesh: one record connects sellers, stock and buyers. Draws once; never loops. */
export function MarketMeshVisualization({ mode = 'animated' }: { mode?: 'animated' | 'static' | 'reduced-motion' }) {
  const [hover, setHover] = useState<string | null>(null)
  const pos = (id: string) => nodes.find(n => n.id === id)!
  const animate = mode === 'animated'
  return (
    <section className="@container" aria-labelledby="mesh-heading">
      <div className="flex flex-col gap-6">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 id="mesh-heading" className="text-3xl font-semibold">One record between seller and buyer</h2>
          <p className="text-md text-muted">Catalogue, stock and orders share one ledger, so a buyer orders against the figure the seller&apos;s store sees.</p>
        </div>
    <figure className="flex min-w-0 flex-col gap-3" aria-labelledby="mesh-caption">
      <svg viewBox="0 0 600 360" className="w-full max-w-3xl" role="img" aria-labelledby="mesh-title mesh-desc">
        <title id="mesh-title">How SokoMesh connects trade</title>
        <desc id="mesh-desc">Sellers publish into the catalogue; every stock movement lands in one ledger; buyers order against that ledger; orders drive fulfilment, which writes back to stock.</desc>
        {links.map(([a, b], i) => {
          const A = pos(a), B = pos(b)
          const lit = hover && (hover === a || hover === b)
          return (
            <line key={`${a}-${b}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke={lit ? 'var(--primary)' : 'var(--border-strong)'} strokeWidth={lit ? 3 : 2}
              strokeDasharray={animate ? 400 : undefined} strokeDashoffset={animate ? 400 : undefined}
              style={animate ? { animation: `mesh-draw var(--motion-thread-duration) var(--motion-thread-ease) ${i * 60}ms forwards` } : undefined} />
          )
        })}
        <g role="list" aria-label="Parts of the market">
        {nodes.map(n => (
          <g key={n.id} onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)} tabIndex={0} onFocus={() => setHover(n.id)} onBlur={() => setHover(null)} role="listitem" aria-label={`${n.label}: ${n.detail}`} className="cursor-default outline-none">
            <rect x={n.x - 64} y={n.y - 26} width={128} height={52}
              fill={n.tone === 'primary' ? 'var(--brand)' : n.tone === 'signal' ? 'var(--signal)' : 'var(--surface)'}
              stroke={hover === n.id ? 'var(--ring-contrast)' : n.tone === 'ink' ? 'var(--foreground)' : 'none'} strokeWidth={hover === n.id ? 3 : 1.5} />
            <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize={15} className="font-display font-bold" fill={n.tone === 'primary' ? 'var(--brand-foreground)' : n.tone === 'signal' ? 'var(--signal-foreground)' : 'var(--foreground)'}>{n.label}</text>
            <text x={n.x} y={n.y + 15} textAnchor="middle" fontSize={12} fill={n.tone === 'primary' ? 'var(--brand-foreground)' : n.tone === 'signal' ? 'var(--signal-foreground)' : 'var(--muted)'}>{n.detail}</text>
          </g>
        ))}
        </g>
      </svg>
      <figcaption id="mesh-caption" className="text-sm text-muted">Point at or tab to a part to trace its links. Counts come from the demo data.</figcaption>
      <style>{'@keyframes mesh-draw { to { stroke-dashoffset: 0 } } @media (prefers-reduced-motion: reduce) { figure svg line { stroke-dashoffset: 0 !important; animation: none !important } }'}</style>
    </figure>
      </div>
    </section>
  )
}

/** Value for both sides of the market, as tabs (narrow) or a split (wide). */
export function BuyerSellerValueSplit({ layout = 'split', buyer, seller }: { layout?: 'split' | 'tabs'; buyer: readonly { title: string; body: string }[]; seller: readonly { title: string; body: string }[] }) {
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

/** Discover → compare → order → fulfil, each step carrying a real component as its example. */
export function TradeFlowStory({ steps }: { steps: readonly FlowStep[] }) {
  const [active, setActive] = useState(steps[0]!.key)
  const current = steps.find(s => s.key === active)!
  return (
    <section id="flow" className="@container" aria-labelledby="flow-title">
    <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <h2 id="flow-title" className="text-3xl font-semibold">From search to delivery</h2>
        <ol className="flex flex-col">
          {steps.map((s, i) => (
            <li key={s.key}>
              <button type="button" aria-pressed={s.key === active} onClick={() => setActive(s.key)}
                className={cn('flex w-full gap-3 rounded-sm px-3 py-3 text-left motion-bind transition-[background-color,transform] active:translate-y-px', s.key === active ? 'bg-primary-soft' : 'hover:bg-sunken')}>
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-xs border-[length:var(--border-stamp)] text-sm font-bold tabular', s.key === active ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong text-muted')}>{i + 1}</span>
                <span className="flex flex-col"><span className="font-semibold">{s.title}</span><span className="text-sm text-muted">{s.body}</span></span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div key={current.key} className="grid min-w-0 animate-transfer place-items-center border border-border bg-background p-4 @4xl:p-6" aria-live="polite"><div className="w-full max-w-md">{current.example}</div></div>
    </div>
    </section>
  )
}

/** Proofs of the three hard guarantees: stock is derivable, holds are bounded, payment applies once. */
export function InventoryTrustProof({ proofs }: { proofs: Record<'stock' | 'reservation' | 'payment', { title: string; body: string; example: ReactNode }> }) {
  const [mode, setMode] = useState<'stock' | 'reservation' | 'payment'>('reservation')
  const p = proofs[mode]
  return (
    <section id="trust" className="@container flex flex-col gap-5" aria-labelledby="trust-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="trust-title" className="max-w-xl text-3xl font-semibold">Two buyers, the last 24 bales, one outcome</h2>
        <Segmented label="Proof" value={mode} onValueChange={setMode} items={[{ value: 'stock', label: 'Stock' }, { value: 'reservation', label: 'Reservation' }, { value: 'payment', label: 'Payment' }]} />
      </div>
      <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-2"><h3 className="font-display text-xl font-semibold">{p.title}</h3><p className="text-md text-muted">{p.body}</p></div>
        <div key={mode} className="min-w-0 animate-reveal">{p.example}</div>
      </div>
    </section>
  )
}
