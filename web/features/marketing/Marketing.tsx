// Divergent (manual ch.6; spec p.56): landing and public storytelling are hand-written on
// purpose. They use the same tokens, primitives, accessibility and reduced-motion rules, and
// embed real projected components instead of pictures of them. Layout answers the section's own
// container (manual 6.12), so a section composes the same inside the design system as on a page.

import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Projection } from '@/components/kernel/Projection'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { buttonStyles } from '@/components/ui/button'
import { ThemeSwitch } from '@/components/ui/theme'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import type { ModelMeta, Rec } from '@/lib/contract/types'
import { brandName } from '@/lib/brand'
import scenes from '@/public/images/scenes/scenes.json'

/**
 * The organic accent, drawn as WOVEN TRADE's thread: two fine strands, forest and amber, crossing like a
 * weave. It replaces the earlier filled band, which read as a road and weighed down the light pages. The
 * strands draw themselves as the section scrolls in (a CSS scroll timeline, no listeners); reduced motion
 * and older browsers show them drawn. `ground="brand"` lifts the forest strand for dark grounds.
 */
export function TradeRibbon({ ground = 'light', className }: { ground?: 'light' | 'brand'; className?: string }) {
  const strand = 'fill-none [stroke-linecap:square] [stroke-width:2]'
  return (
    <svg aria-hidden="true" viewBox="0 0 1200 120" preserveAspectRatio="none" className={cn('thread-weave pointer-events-none block w-full overflow-visible', className)}>
      <path vectorEffect="non-scaling-stroke" d="M0 74C190 74 300 22 600 40S1010 104 1200 54"
        className={cn(strand, ground === 'brand' ? 'stroke-brand-foreground/70' : 'stroke-primary')} />
      <path vectorEffect="non-scaling-stroke" d="M0 50C210 50 330 102 600 82S990 18 1200 70" className={cn(strand, 'stroke-signal')} />
    </svg>
  )
}

/** A prepared scene photograph (design/photography/scenes.py): graded, cropped, with a blur placeholder. */
export type Scene = { src: string; width: number; height: number; alt: string; blurDataURL?: string; focus?: readonly number[] }

/** The scene's focal point as object-position, so any crop keeps its subject in frame. */
export const focusOf = (scene: Scene) => (scene.focus ? { objectPosition: `${scene.focus[0]! * 100}% ${scene.focus[1]! * 100}%` } : undefined)

/** One label and route per intent across header, hero, CTA and footer. */
export const cta = {
  browse: { label: 'All categories', href: '/catalogue' },
  buy: { label: 'Start buying', href: '/register?as=buyer' },
  sell: { label: 'Apply to sell', href: '/register?as=seller' },
  flow: { label: 'How ordering works', href: '/#flow' },
  manage: { label: 'What sellers manage', href: '/#value' },
} as const

// The value each side of the market is promised, from PRODUCT.md: what the finished product does.
export const buyerValue = [
  { title: 'One cart, several wholesalers', body: 'Lines are grouped by seller, each with its own delivery fee and dispatch day.' },
  { title: 'Stock held while you pay', body: 'Checkout reserves the units for 15 minutes so nobody else takes them mid-payment.' },
  { title: 'Prices you can explain', body: 'Every price says which rule set it: base, your buyer group or a quantity tier.' },
  { title: 'Approvals before money moves', body: 'Owners set a limit; larger orders wait for approval and the API enforces it.' },
]
export const sellerValue = [
  { title: 'Categories that build your forms', body: 'Publish against a category contract and its fields, filters and comparison rows appear everywhere.' },
  { title: 'A stock ledger, not a stock number', body: 'Receipts, holds, releases and shipments are kept as movements, so availability is always explainable.' },
  { title: 'Quotes and price books', body: 'Buyer-group and volume prices with conflicts flagged before buyers see them.' },
  { title: 'Pick, pack and hand over', body: 'Short-ship, substitute and attach evidence from the same order record.' },
]

/** The page's one oversized statement; pages put a product photograph in front of it. */
export const statementCopy = {
  lines: ['Trade without', 'the tangle.'] as const,
  body: 'One record of stock, price and order sits between every buyer and seller, so nobody restocks against a guess.',
}

export type HeroEmphasis = 'default' | 'buyer' | 'seller'

type Link = { label: string; href: string }
const heroCopy: Record<HeroEmphasis, { line: string; body: string; primary: Link; secondary: Link }> = {
  default: {
    line: 'Order wholesale against real stock.',
    body: 'One cart across several wholesalers. Stock is held for you while you pay by M-Pesa.',
    primary: cta.buy, secondary: cta.sell,
  },
  buyer: {
    line: 'Every wholesaler you use, in one cart.',
    body: 'Each price shows how it was set, stock is held for 15 minutes at checkout, and you pay by M-Pesa.',
    primary: cta.buy, secondary: cta.flow,
  },
  seller: {
    line: 'One catalogue, one stock ledger, every buyer.',
    body: 'Publish against category contracts, set buyer-group and quantity prices, and fulfil from the order record.',
    primary: cta.sell, secondary: cta.manage,
  },
}

/** Commercial terms that hold for every order (PRODUCT.md), shown as quantities rather than claims. */
const heroTerms = [
  { value: '15 min', label: 'Stock held while you pay' },
  { value: 'KES', label: 'Every price to two decimals' },
  { value: '1 cart', label: 'Across several wholesalers' },
] as const

export type HeroPanel = {
  scene: Scene
  heading: string
  body: string
  cta: Link
  /** Light text sits on the photograph's darkened lower part; dark text on a pale, quiet area. */
  text: 'light' | 'dark'
  place: 'top' | 'bottom'
}

/** The two doors of the landing hero: one per side of the market, each with its own photograph and action. */
export const heroPanels: readonly [HeroPanel, HeroPanel] = [
  { scene: scenes['hero-retail'], heading: 'Order wholesale against real stock.', body: 'One cart across several wholesalers. Stock is held for you while you pay by M-Pesa.', cta: cta.buy, text: 'light', place: 'bottom' },
  { scene: scenes['hero-warehouse'], heading: 'Sell to every retailer from one stock ledger.', body: 'Publish against category contracts, price by buyer group and quantity, and fulfil from the order record.', cta: cta.sell, text: 'dark', place: 'top' },
]

/** The trade terms as a ruled row of figures: the market's numbers, not claims. */
function HeroTerms({ wide }: { wide?: boolean }) {
  return (
    <dl className={cn('grid grid-cols-3 border-t border-foreground', wide && 'border-b border-b-border')}>
      {heroTerms.map(t => (
        <div key={t.value} className={cn('flex min-w-0 flex-col gap-1 border-r border-border py-3 pr-3 last:border-r-0 [&:not(:first-child)]:pl-3', wide && '@3xl:flex-row @3xl:items-baseline @3xl:gap-3 @3xl:py-4')}>
          <dt className={cn('text-xs text-muted', wide && '@3xl:order-2 @3xl:text-sm')}>{t.label}</dt>
          <dd className="font-display text-xl font-extrabold whitespace-nowrap tabular @sm:text-2xl @md:text-3xl">{t.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Landing hero, in two compositions. With `panels`, two photographs side by side, each a door into one
 * side of the market with its own headline and action (after Tanini Home's split), and the trade terms as
 * a ruled row beneath. With `board`, the headline beside a live product shelf with the ribbon behind it.
 */
export function MercantileHero({ emphasis = 'default', compact = false, board, panels }: { emphasis?: HeroEmphasis; compact?: boolean; board?: ReactNode; panels?: readonly [HeroPanel, HeroPanel] }) {
  const c = heroCopy[emphasis]
  if (panels) {
    return (
      <section className="@container flex flex-col" aria-labelledby="hero-title">
        <div className="grid grid-cols-1 gap-px bg-border @3xl:grid-cols-2">
          {panels.map((panel, i) => {
            const Heading = i === 0 ? 'h1' : 'h2'
            const light = panel.text === 'light'
            return (
              // Wide: the words sit on the photograph's prepared area (darkened below, veiled above). Narrow: the
              // photograph sits above the words, which stand on a solid ground matching their tone, so contrast never
              // depends on the crop. The same ground shows while the photograph loads or if it fails.
              <div key={panel.heading} className={cn('relative isolate flex flex-col overflow-hidden bg-background @3xl:min-h-[38rem]', light ? '@3xl:bg-chrome' : '@3xl:bg-well')}>
                <div className="relative aspect-[4/3] @3xl:absolute @3xl:inset-0 @3xl:-z-10 @3xl:aspect-auto">
                  <Image src={panel.scene.src} alt={panel.scene.alt} fill sizes="(min-width: 768px) 50vw, 100vw" preload={i === 0}
                    placeholder={panel.scene.blurDataURL ? 'blur' : 'empty'} blurDataURL={panel.scene.blurDataURL} style={focusOf(panel.scene)} className="object-cover" />
                </div>
                <div className={cn('flex max-w-xl flex-col gap-4 p-6 text-foreground @xl:p-10', panel.place === 'bottom' ? '@3xl:mt-auto' : '', light && '@3xl:text-chrome-foreground')}>
                  <Heading id={i === 0 ? 'hero-title' : undefined} className={cn('font-extrabold tracking-display', i === 0 ? 'text-3xl @md:text-4xl @6xl:text-5xl' : 'text-3xl @6xl:text-4xl')}>{panel.heading}</Heading>
                  <p className={cn('max-w-[40ch] text-lg text-foreground', light && '@3xl:text-chrome-foreground/90')}>{panel.body}</p>
                  <a href={panel.cta.href} className={cn(buttonStyles({ variant: light ? 'signal' : 'primary', size: 'lg' }), 'group self-start active:scale-[0.98]')}>{panel.cta.label}<Icon icon={ArrowRight} className="motion-bind transition-transform group-hover:translate-x-1" /></a>
                </div>
              </div>
            )
          })}
        </div>
        <HeroTerms wide />
      </section>
    )
  }
  return (
    <section className="@container relative isolate" aria-labelledby="hero-title">
      <div className={cn('grid grid-cols-1 items-start gap-10', board && '@4xl:grid-cols-2', compact ? 'py-8' : 'pt-12 @4xl:pt-16', !board && !compact && 'pb-12')}>
        <div className="flex max-w-2xl flex-col gap-7">
          <h1 id="hero-title" className={cn('font-extrabold tracking-display text-foreground', compact ? 'text-3xl @md:text-4xl' : 'text-4xl @6xl:text-5xl @7xl:text-6xl')}>
            {c.line}
          </h1>
          <p className="max-w-[46ch] text-lg text-muted">{c.body}</p>
          <div className="flex flex-wrap gap-3">
            <a href={c.primary.href} className={buttonStyles({ variant: 'primary', size: 'lg' })}>{c.primary.label}<Icon icon={ArrowRight} /></a>
            <a href={c.secondary.href} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>{c.secondary.label}</a>
          </div>
          {compact ? null : <HeroTerms />}
        </div>
        {board ? <div className="min-w-0">{board}</div> : null}
      </div>
      {/* Behind the shelf's last row only: the text column ends higher, so the band never runs under copy. */}
      {board && !compact ? <TradeRibbon className="relative -z-10 -mt-20 h-32 @4xl:-mt-28 @4xl:h-44" /> : null}
    </section>
  )
}

export type Category = { key: string; name: string; products: number; image: string; alt: string; scene?: Scene; href?: string }

/**
 * Category discovery. `photo` leads with a scene photograph per category in tall tiles (after Faire and
 * Tanini Home); `grid`, `carousel` and `stacked` use the product cut-outs on the well.
 */
export function CategoryShowcase({ categories, layout = 'grid' }: { categories: readonly Category[]; layout?: 'photo' | 'grid' | 'carousel' | 'stacked' }) {
  if (layout === 'photo') {
    return (
      <section className="@container flex flex-col gap-6" aria-labelledby="cat-title" id="catalogue">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="cat-title" className="text-3xl font-semibold @5xl:text-4xl">Shop by category</h2>
          <a href={cta.browse.href} className="inline-flex items-center gap-1 text-md font-semibold text-primary hover:underline">{cta.browse.label}<Icon icon={ArrowRight} /></a>
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-7 @3xl:grid-cols-3 @3xl:gap-x-4">
          {categories.map(cat => (
            <li key={cat.key} className="scroll-reveal">
              <a href={cat.href ?? `#${cat.key}`} className="group flex flex-col gap-3">
                <span className="relative block aspect-[4/5] overflow-hidden bg-well">
                  {cat.scene ? (
                    <Image src={cat.scene.src} alt="" fill sizes="(min-width: 768px) 33vw, 50vw" placeholder={cat.scene.blurDataURL ? 'blur' : 'empty'} blurDataURL={cat.scene.blurDataURL}
                      className="object-cover motion-reveal transition-[filter] group-hover:brightness-105" />
                  ) : <Image src={cat.image} alt="" fill sizes="33vw" className="object-contain p-[12%]" />}
                </span>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-semibold group-hover:underline">{cat.name}</span>
                  <span className="shrink-0 text-sm text-muted tabular">{cat.products} {cat.products === 1 ? 'product' : 'products'}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    )
  }
  return (
    <section className="@container flex flex-col gap-5" aria-labelledby="cat-title" id="catalogue">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="cat-title" className="text-3xl font-semibold">Shop by category</h2>
        <a href={cta.browse.href} className="inline-flex items-center gap-1 text-md font-semibold text-primary hover:underline">{cta.browse.label}<Icon icon={ArrowRight} /></a>
      </div>
      <ul className={cn(
        layout === 'grid' && 'grid grid-cols-2 border-t border-l border-border @xl:grid-cols-3 @4xl:grid-cols-6',
        layout === 'carousel' && 'flex snap-x snap-mandatory overflow-x-auto border-t border-l border-border',
        layout === 'stacked' && 'flex flex-col divide-y divide-border border border-border bg-surface',
      )}>
        {categories.map(cat => (
          <li key={cat.key} className={cn(layout === 'carousel' && 'w-48 shrink-0 snap-start', layout !== 'stacked' && 'border-r border-b border-border', 'bg-surface')}>
            <a href={cat.href ?? `#${cat.key}`} className={cn('group flex h-full motion-bind transition-colors hover:bg-sunken active:bg-sunken', layout === 'stacked' ? 'items-center gap-4 p-3' : 'flex-col')}>
              {/* Photographs are cut-outs on the theme's well, the same treatment as product cells. */}
              <span className={cn('block bg-well', layout === 'stacked' ? 'size-16 shrink-0' : 'border-b border-border')}>
                <Image src={cat.image} alt={cat.alt} width={240} height={180} className={cn('object-contain', layout === 'stacked' ? 'size-16 p-1.5' : 'aspect-[4/3] w-full p-[10%]')} />
              </span>
              <span className={cn('flex flex-col', layout !== 'stacked' && 'gap-0.5 p-3')}>
                <span className="font-semibold group-hover:text-primary group-hover:underline">{cat.name}</span>
                <span className="text-sm text-muted tabular">{cat.products} {cat.products === 1 ? 'product' : 'products'}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A merchandised row of product cells from the real projection (after Tanini Home and Bélanger listings). */
export function ProductRail({ title, meta, records, href, all, now }: {
  title: string; meta: ModelMeta; records: readonly Rec[]; href: (r: Rec) => string; all?: { label: string; href: string }; now?: string
}) {
  return (
    <section aria-labelledby="rail-title" className="@container scroll-reveal flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="rail-title" className="text-3xl font-semibold @5xl:text-4xl">{title}</h2>
        {all ? <a href={all.href} className="inline-flex items-center gap-1 text-md font-semibold text-primary hover:underline">{all.label}<Icon icon={ArrowRight} /></a> : null}
      </div>
      <ul className="grid grid-cols-2 border-t border-l border-border @4xl:grid-cols-4">
        {records.map(p => (
          <li key={p.id} className="flex border-r border-b border-border bg-surface">
            <Projection meta={meta} record={p} context="list" override={{ intent: 'media', surface: 'flat' }} now={now} href={href(p)} className="w-full" />
          </li>
        ))}
      </ul>
    </section>
  )
}

export type StoryItem = { title: string; body: string }

/**
 * Photography and commerce side by side (after Joonbyrd's storytelling): a scene photograph on one half,
 * the argument on the other, joined in one ruled container. `side` puts the photograph left or right;
 * no more than two run in a row on a page.
 */
export function StorySplit({ scene, title, body, items, link, side = 'left', id }: {
  scene: Scene; title: string; body: string; items?: readonly StoryItem[]; link?: Link; side?: 'left' | 'right'; id?: string
}) {
  return (
    <section id={id} className="@container scroll-reveal" aria-label={title}>
      <div className="grid grid-cols-1 border border-border bg-surface @3xl:grid-cols-2">
        <div className={cn('relative aspect-[4/3] overflow-hidden bg-well @3xl:aspect-auto @3xl:min-h-[34rem]', side === 'right' && '@3xl:order-2')}>
          <Image src={scene.src} alt={scene.alt} fill sizes="(min-width: 768px) 50vw, 100vw" placeholder={scene.blurDataURL ? 'blur' : 'empty'} blurDataURL={scene.blurDataURL} style={focusOf(scene)} className="object-cover" />
        </div>
        <div className="flex flex-col justify-center gap-6 p-6 @xl:p-10 @5xl:p-14">
          <h2 className="max-w-[18ch] text-3xl font-semibold @5xl:text-4xl">{title}</h2>
          <p className="max-w-[46ch] text-lg text-muted">{body}</p>
          {items?.length ? (
            <ul className="flex flex-col divide-y divide-border border-t border-border">
              {items.map(item => (
                <li key={item.title} className="flex flex-col gap-1 py-3.5">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-md text-muted">{item.body}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {link ? <a href={link.href} className="inline-flex items-center gap-1 self-start text-md font-semibold text-primary hover:underline">{link.label}<Icon icon={ArrowRight} /></a> : null}
        </div>
      </div>
    </section>
  )
}

/**
 * One oversized statement per page (after Bélanger's "timeless aesthetics"): the line set at the container's
 * width, with a product cut-out standing in front of it. The words stay readable text; the photograph is
 * decoration and carries no name.
 */
export function TradeStatement({ lines, product, body, link }: {
  lines: readonly [string, string]; product: { src: string; width: number; height: number }; body: string; link?: Link
}) {
  return (
    <section className="@container scroll-reveal" aria-labelledby="statement-title">
      <div className="flex flex-col items-center gap-10 py-6">
        {/* The cut-out spans the two lines only, centred, so it stands in front of the words and never over the paragraph. */}
        <div className="relative isolate w-full">
          <h2 id="statement-title" className="w-full text-center font-extrabold text-statement tracking-display">
            <span className="block text-foreground">{lines[0]}</span>
            <span className="block text-primary">{lines[1]}</span>
          </h2>
          <Image src={product.src} alt="" width={product.width} height={product.height} sizes="20vw"
            className="pointer-events-none absolute -top-[8%] left-1/2 h-[116%] w-auto -translate-x-1/2 object-contain" />
        </div>
        <div className="flex max-w-[46ch] flex-col items-center gap-4 text-center">
          <p className="text-lg text-muted">{body}</p>
          {link ? <a href={link.href} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>{link.label}<Icon icon={ArrowRight} /></a> : null}
        </div>
      </div>
    </section>
  )
}

/**
 * A strip of headline figures or terms. `source` says where the figures come from; pass it whenever
 * they are not a property of the product itself (demo seed, a reporting period).
 */
export function WholesaleMetricsStrip({ metrics, compact = false, label = 'At a glance', source }: { metrics: readonly { label: string; value: string; note?: string }[]; compact?: boolean; label?: string; source?: string }) {
  return (
    <section aria-label={label} className="@container flex flex-col gap-2">
      <dl className={cn('grid grid-cols-2 gap-px overflow-hidden border border-border bg-border', metrics.length >= 4 ? '@3xl:grid-cols-4' : metrics.length === 3 ? '[&>*:last-child]:col-span-2 @xl:grid-cols-3 @xl:[&>*:last-child]:col-span-1' : '')}>
        {metrics.map(m => (
          <div key={m.label} className={cn('flex flex-col gap-1 bg-surface', compact ? 'p-3' : 'p-5')}>
            <dt className="text-sm text-muted">{m.label}</dt>
            <dd className={cn('font-display font-extrabold tabular', compact ? 'text-2xl' : 'text-4xl')}>{m.value}</dd>
            {m.note ? <dd className="text-sm text-muted">{m.note}</dd> : null}
          </div>
        ))}
      </dl>
      {source ? <p className="text-xs text-muted">{source}</p> : null}
    </section>
  )
}

/** Conversion close. Dual offers both sides; full sits on the brand ground with the ribbon, compact is a ruled band. */
export function MarketingCTA({ audience = 'dual', size = 'full', scene }: { audience?: 'buyer' | 'seller' | 'dual'; size?: 'full' | 'compact'; scene?: Scene }) {
  const buyer = <a href={cta.buy.href} className={buttonStyles({ variant: 'primary', size: 'lg' })}>{cta.buy.label}</a>
  const seller = <a href={cta.sell.href} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>{cta.sell.label}</a>
  if (size === 'compact') {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 border-y border-foreground py-4" aria-label="Get started">
        <p className="font-display text-xl font-semibold">{audience === 'seller' ? 'List your catalogue against real category contracts.' : 'Your next restock, from every wholesaler, in one order.'}</p>
        <div className="flex flex-wrap gap-2">{audience !== 'seller' ? buyer : null}{audience !== 'buyer' ? seller : null}</div>
      </section>
    )
  }
  // The close (after the editorial splits of the references): the statement set large on the warm ground,
  // forest and amber kept to type, rules and the woven thread, and a photograph carrying the colour.
  const [first, second] = closeLines[audience]
  const arrow = <Icon icon={ArrowRight} className="motion-bind transition-transform group-hover:translate-x-1" />
  return (
    <section className="@container scroll-reveal flex flex-col gap-8" aria-labelledby="cta-title">
      <TradeRibbon className="h-12 @4xl:h-16" />
      <div className={cn('grid grid-cols-1 gap-10 border-t border-foreground pt-8 @4xl:gap-16', scene && '@4xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]')}>
        <div className="flex flex-col gap-8 @4xl:justify-between">
          <div className="flex flex-col gap-6">
            <h2 id="cta-title" className="font-extrabold tracking-display text-[clamp(2.5rem,5.4cqw,5.25rem)] leading-[0.95] text-balance">
              <span className="block">{first}</span>
              <span className="block text-primary">{second}</span>
            </h2>
            <p className="max-w-[46ch] text-lg text-muted text-pretty">
              Stock, price and order are kept once and shown to both sides. Accounts are reviewed before trading starts, and payment is by M-Pesa through SellaPay.
            </p>
            <div className="flex flex-wrap gap-3">
              {audience !== 'seller' ? <a href={cta.buy.href} className={cn(buttonStyles({ variant: 'signal', size: 'lg' }), 'group active:scale-[0.98]')}>{cta.buy.label}{arrow}</a> : null}
              {audience !== 'buyer' ? <a href={cta.sell.href} className={cn(buttonStyles({ variant: audience === 'seller' ? 'primary' : 'secondary', size: 'lg' }), 'group active:scale-[0.98]')}>{cta.sell.label}{arrow}</a> : null}
            </div>
          </div>
          <ol className="grid grid-cols-1 border-t border-border-strong @xl:grid-cols-3" aria-label="How joining works">
            {joinSteps.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-1.5 border-b border-border py-4 @xl:border-b-0 @xl:border-r @xl:px-4 @xl:first:pl-0 @xl:last:border-r-0">
                <span className="font-display text-2xl font-extrabold text-primary tabular">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-semibold">{step.title}</span>
                <span className="text-md text-muted">{step.body}</span>
              </li>
            ))}
          </ol>
        </div>
        {scene ? (
          <div className="relative aspect-[4/5] overflow-hidden bg-well @4xl:aspect-auto @4xl:min-h-[34rem]">
            {/* Settles from a slight zoom as it scrolls in: transform only, off for reduced motion. */}
            <Image src={scene.src} alt={scene.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" placeholder={scene.blurDataURL ? 'blur' : 'empty'} blurDataURL={scene.blurDataURL} style={focusOf(scene)} className="scroll-settle object-cover" />
          </div>
        ) : null}
      </div>
    </section>
  )
}

const closeLines: Record<'buyer' | 'seller' | 'dual', readonly [string, string]> = {
  dual: ['Buyers and sellers,', 'on one record.'],
  buyer: ['Restock from every', 'wholesaler at once.'],
  seller: ['Sell to retailers who', 'order real stock.'],
}

/** How an account starts, as the product works today (registration, review), then what trading means. */
const joinSteps = [
  { title: 'Register', body: 'A shop or a wholesaler signs up and confirms its email with a code.' },
  { title: 'Get reviewed', body: 'The marketplace checks the documents before any trading starts.' },
  { title: 'Trade on one record', body: 'Prices in KES, stock you can see, payment by M-Pesa through SellaPay.' },
] as const

// Only pages that exist are linked; the rest of the specification's pages join as their features land.
const footerLinks = [
  { title: 'Buy', links: [cta.browse, cta.flow, cta.buy] },
  { title: 'Sell', links: [cta.sell, cta.manage, { label: 'Sign in', href: '/login' }] },
  { title: 'Project', links: [{ label: 'Design system', href: '/design-system' }] },
] as const

/**
 * The close of a MARKET page, on the chrome ground like the masthead's terms strip, so the page is bookended.
 * Full adds the brand and link columns; minimal keeps only the notice and the operating terms.
 */
export function MarketingFooter({ variant = 'full' }: { variant?: 'full' | 'minimal' }) {
  return (
    // On the page's own warm ground, ruled off by the ink line: the colour stays in the type, not a slab.
    <footer className="@container border-t-2 border-foreground bg-background text-foreground">
      {variant === 'full' ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 px-4 pt-12 pb-10 @xl:px-10 @4xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 flex flex-col gap-4 @4xl:col-span-1">
            <BrandLogo variant="lockup" width={300} className="-m-3 self-start" />
            <p className="max-w-xs text-md text-muted">Multi-vendor wholesale ordering and inventory for Kenyan retailers and wholesalers.</p>
          </div>
          {footerLinks.map(col => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3 border-t border-border-strong pt-3">
              <h2 className="caps font-sans text-muted">{col.title}</h2>
              <ul className="flex flex-col gap-2">{col.links.map(l => <li key={l.label}><a href={l.href} className="text-md underline-offset-4 hover:text-primary hover:underline">{l.label}</a></li>)}</ul>
            </nav>
          ))}
        </div>
      ) : null}
      <div className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-muted @xl:px-10', variant === 'full' && 'border-t border-border')}>
        <span>&copy; 2026 {brandName}. Portfolio concept; name and identity not yet cleared for commercial use.</span>
        <span className="flex flex-wrap items-center gap-3">Prices in KES, times in East Africa Time<ThemeSwitch /></span>
      </div>
    </footer>
  )
}
