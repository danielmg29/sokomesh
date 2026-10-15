// Divergent (manual ch.6; spec p.56): landing and public storytelling are hand-written on
// purpose. They use the same tokens, primitives, accessibility and reduced-motion rules, and
// embed real projected components instead of pictures of them. Layout answers the section's own
// container (manual 6.12), so a section composes the same inside the design system as on a page.

import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { buttonStyles } from '@/components/ui/button'
import { ThemeSwitch } from '@/components/ui/theme'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import { brandName, brandTagline } from '@/lib/brand'

/**
 * The organic accent (theme blend: 10% organic, which lives in photography and this ribbon, not in the
 * components): one flowing band with the amber thread along it, the THREAD idea drawn as cloth. Used at
 * most twice a page, always behind the grid so square cells cut it into segments. Static: it never loops.
 */
export function TradeRibbon({ ground = 'light', className }: { ground?: 'light' | 'brand'; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1200 220" preserveAspectRatio="none" className={cn('pointer-events-none block w-full', className)}>
      <path
        d="M0 128C250 128 370 36 640 48C890 59 990 150 1200 104V148C990 194 890 103 640 92C370 80 250 172 0 172Z"
        className={ground === 'brand' ? 'fill-chrome' : 'fill-brand'}
      />
      <path d="M0 150C250 150 370 58 640 70C890 81 990 172 1200 126" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" className="stroke-signal" />
    </svg>
  )
}

/** A prepared scene photograph (design/photography/scenes.py): graded, cropped, with a blur placeholder. */
export type Scene = { src: string; width: number; height: number; alt: string; blurDataURL?: string; focus?: readonly number[] }

/** The scene's focal point as object-position, so any crop keeps its subject in frame. */
export const focusOf = (scene: Scene) => (scene.focus ? { objectPosition: `${scene.focus[0]! * 100}% ${scene.focus[1]! * 100}%` } : undefined)

/** One label per intent across header, hero, CTA and footer. */
export const cta = {
  browse: { label: 'All categories', href: '#catalogue' },
  buy: { label: 'Start buying', href: '#buy' },
  sell: { label: 'Apply to sell', href: '#sell' },
  flow: { label: 'How ordering works', href: '#flow' },
  manage: { label: 'What sellers manage', href: '#value' },
} as const

export type HeroEmphasis = 'default' | 'buyer' | 'seller'

type Link = (typeof cta)[keyof typeof cta]
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
              <div key={panel.heading} className={cn('relative isolate flex flex-col overflow-hidden @3xl:min-h-[38rem]', light ? 'bg-chrome' : 'bg-well')}>
                <div className="relative aspect-[4/3] @3xl:absolute @3xl:inset-0 @3xl:-z-10 @3xl:aspect-auto">
                  <Image src={panel.scene.src} alt={panel.scene.alt} fill sizes="(min-width: 768px) 50vw, 100vw" preload={i === 0}
                    placeholder={panel.scene.blurDataURL ? 'blur' : 'empty'} blurDataURL={panel.scene.blurDataURL} style={focusOf(panel.scene)} className="object-cover" />
                </div>
                <div className={cn('flex max-w-xl flex-col gap-4 p-6 @xl:p-10', panel.place === 'bottom' ? '@3xl:mt-auto' : '', light ? 'on-chrome text-chrome-foreground' : 'text-foreground')}>
                  <Heading id={i === 0 ? 'hero-title' : undefined} className={cn('font-extrabold tracking-display', i === 0 ? 'text-3xl @md:text-4xl @6xl:text-5xl' : 'text-3xl @6xl:text-4xl')}>{panel.heading}</Heading>
                  <p className={cn('max-w-[40ch] text-lg', light ? 'text-chrome-foreground/90' : 'text-foreground')}>{panel.body}</p>
                  <a href={panel.cta.href} className={cn(buttonStyles({ variant: light ? 'signal' : 'primary', size: 'lg' }), 'self-start')}>{panel.cta.label}<Icon icon={ArrowRight} /></a>
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

export type Category = { key: string; name: string; products: number; image: string; alt: string; scene?: Scene }

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
              <a href={`#${cat.key}`} className="group flex flex-col gap-3">
                <span className="relative block aspect-[4/5] overflow-hidden bg-well">
                  {cat.scene ? (
                    <Image src={cat.scene.src} alt="" fill sizes="(min-width: 768px) 33vw, 50vw" placeholder={cat.scene.blurDataURL ? 'blur' : 'empty'} blurDataURL={cat.scene.blurDataURL}
                      className="object-cover motion-reveal transition-[filter] group-hover:brightness-105" />
                  ) : <Image src={cat.image} alt="" fill sizes="33vw" className="object-contain p-[12%]" />}
                </span>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-semibold group-hover:underline">{cat.name}</span>
                  <span className="shrink-0 text-sm text-muted tabular">{cat.products} products</span>
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
            <a href={`#${cat.key}`} className={cn('group flex h-full motion-bind transition-colors hover:bg-sunken active:bg-sunken', layout === 'stacked' ? 'items-center gap-4 p-3' : 'flex-col')}>
              {/* Photographs are cut-outs on the theme's well, the same treatment as product cells. */}
              <span className={cn('block bg-well', layout === 'stacked' ? 'size-16 shrink-0' : 'border-b border-border')}>
                <Image src={cat.image} alt={cat.alt} width={240} height={180} className={cn('object-contain', layout === 'stacked' ? 'size-16 p-1.5' : 'aspect-[4/3] w-full p-[10%]')} />
              </span>
              <span className={cn('flex flex-col', layout !== 'stacked' && 'gap-0.5 p-3')}>
                <span className="font-semibold group-hover:text-primary group-hover:underline">{cat.name}</span>
                <span className="text-sm text-muted tabular">{cat.products} products</span>
              </span>
            </a>
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
  const buyer = <a href={cta.buy.href} className={buttonStyles({ variant: size === 'full' ? 'signal' : 'primary', size: 'lg' })}>{cta.buy.label}</a>
  const seller = <a href={cta.sell.href} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>{cta.sell.label}</a>
  if (size === 'compact') {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 border-y border-foreground py-4" aria-label="Get started">
        <p className="font-display text-xl font-semibold">{audience === 'seller' ? 'List your catalogue against real category contracts.' : 'Your next restock, from every wholesaler, in one order.'}</p>
        <div className="flex flex-wrap gap-2">{audience !== 'seller' ? buyer : null}{audience !== 'buyer' ? seller : null}</div>
      </section>
    )
  }
  return (
    <section className={cn('@container', scene && 'grid grid-cols-1 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]')} aria-labelledby="cta-title">
      {scene ? (
        <div className="relative aspect-[16/9] overflow-hidden bg-chrome @4xl:order-2 @4xl:aspect-auto">
          <Image src={scene.src} alt={scene.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" placeholder={scene.blurDataURL ? 'blur' : 'empty'} blurDataURL={scene.blurDataURL} style={focusOf(scene)} className="object-cover" />
        </div>
      ) : null}
      <div className={cn('on-chrome relative isolate flex flex-col gap-6 overflow-hidden bg-brand px-6 pt-10 pb-24 text-brand-foreground @xl:px-10 @4xl:pb-10', scene && '@4xl:justify-center @4xl:py-16 @4xl:pb-28')}>
        <TradeRibbon ground="brand" className={cn('absolute bottom-0 left-0 -z-10 h-20', scene ? '@4xl:h-28' : '@4xl:left-1/2 @4xl:h-36 @4xl:w-1/2')} />
        <h2 id="cta-title" className="max-w-2xl text-3xl font-semibold @xl:text-4xl">{audience === 'seller' ? 'Sell to retailers who order against your real stock.' : audience === 'buyer' ? 'Restock without phoning five wholesalers.' : 'Buyers and sellers on one record of stock, price and order.'}</h2>
        <p className="max-w-xl text-lg text-brand-foreground/85">Accounts are reviewed before trading starts. Payment is by M-Pesa through SellaPay.</p>
        <div className="flex flex-wrap gap-3">{audience !== 'seller' ? buyer : null}{audience !== 'buyer' ? seller : null}</div>
      </div>
    </section>
  )
}

const footerLinks = [
  { title: 'Buy', links: [cta.browse.label, cta.flow.label, 'Purchase approvals', 'Delivery and returns'] },
  { title: 'Sell', links: [cta.sell.label, 'Category contracts', 'Price books', 'Fulfilment'] },
  { title: 'Project', links: ['Design system', 'Contract changelog'] },
] as const

/**
 * The close of a MARKET page, on the chrome ground like the masthead's terms strip, so the page is bookended.
 * Full adds the brand and link columns; minimal keeps only the notice and the operating terms.
 */
export function MarketingFooter({ variant = 'full' }: { variant?: 'full' | 'minimal' }) {
  return (
    <footer className="@container on-chrome bg-chrome text-chrome-foreground">
      {variant === 'full' ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 px-6 pt-12 pb-10 @xl:px-10 @4xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 flex flex-col gap-4 @4xl:col-span-1">
            <BrandLogo variant="lockup" width={200} ground="dark" className="-m-3 self-start" />
            <p className="max-w-xs text-md text-chrome-muted">{brandTagline}. Multi-vendor wholesale ordering and inventory for Kenyan retailers and wholesalers.</p>
          </div>
          {footerLinks.map(col => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3 border-t border-chrome-muted/40 pt-3">
              <h2 className="caps font-sans text-chrome-muted">{col.title}</h2>
              <ul className="flex flex-col gap-2">{col.links.map(l => <li key={l}><a href={l === 'Design system' ? '/design-system' : '#'} className="text-md hover:text-signal hover:underline">{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
      ) : null}
      <div className={cn('flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm text-chrome-muted @xl:px-10', variant === 'full' && 'border-t border-chrome-muted/40')}>
        <span>&copy; 2026 {brandName}. Portfolio concept; name and identity not yet cleared for commercial use.</span>
        <span className="flex flex-wrap items-center gap-3">Prices in KES, times in East Africa Time<ThemeSwitch tone="chrome" /></span>
      </div>
    </footer>
  )
}
