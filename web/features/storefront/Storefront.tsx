// The public storefront (SM-F-22 pages, SM-F-08 search and filters, SM-F-09 comparison), rendered on the
// server from published products only (the API filters out drafts and unapproved sellers), so product
// content, page links and structured data are in the HTML. Product cells are the contract's projection;
// buyer filters are the category contract's facets; the state of every list lives in its URL.

import { Phone } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { AddToCart, BuyBox } from '@/components/commerce/buy'
import { CategoryHero, FacetFilterPanel } from '@/components/commerce/catalog'
import { CompareToggle } from '@/components/commerce/compare'
import { ProductGallery, type GalleryImage } from '@/components/commerce/gallery'
import { stockFrom } from '@/components/commerce/types'
import { Projection } from '@/components/kernel/Projection'
import { UrlPageSize, UrlPager, UrlSort } from '@/components/kernel/blocks/UrlListControls'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { RichTextView } from '@/components/kernel/fields/views'
import { Breadcrumbs } from '@/components/kernel/nav/Breadcrumbs'
import { buttonStyles } from '@/components/ui/button'
import type { ComboOption } from '@/components/ui/combobox'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { ProductComparisonBlock, type CompareProduct } from '@/features/comparison/ProductComparisonBlock'
import { type Scene } from '@/features/marketing/Marketing'
import { MarketingHeader } from '@/features/marketing/MarketingInteractive'
import type { CategoryRecord, ComparisonRecord, ProductDetailRecord, ProductRecord, RichValue } from '@/lib/client/records'
import { ProductMeta } from '@/lib/contract/generated'
import type { FieldMeta, ListPage, ModelMeta, Rec } from '@/lib/contract/types'
import { formatPhone } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import scenes from '@/public/images/scenes/scenes.json'
import { StorefrontAccount } from './StorefrontAccount'

/** Presentation only: which prepared scene photograph stands for each seeded category. */
const CATEGORY_SCENES: Record<string, Scene> = {
  'flour-grains': scenes['category-grains'], sugar: scenes['category-sugar'], 'cooking-oils': scenes['category-oil'],
  'tea-beverages': scenes['category-tea'], household: scenes['category-household'], dairy: scenes['category-dairy'],
}
export const sceneFor = (slug: string): Scene | undefined => CATEGORY_SCENES[slug]
export const productHref = (p: Rec) => `/products/${String(p.slug)}`
export const categoryHref = (c: { slug: string }) => `/catalogue/${c.slug}` as Route

/** The public header's main row on live pages (the landing's own sections, plus the catalogue). */
export const storefrontLinks = [
  { label: 'Catalogue', href: '/catalogue' }, { label: 'Buyers and sellers', href: '/#value' }, { label: 'Design system', href: '/design-system' },
] as const

export function StorefrontHeader({ categories, current = '' }: { categories: readonly CategoryRecord[]; current?: string }) {
  return (
    <MarketingHeader sticky search={false} current={current} links={storefrontLinks} account={<StorefrontAccount />}
      categories={categories.filter(c => c.product_count > 0).map(c => ({ key: c.slug, name: c.name, href: categoryHref(c) }))} />
  )
}

const guide = (name: string, label: string): FieldMeta => ({ name, type: 'richtext', widget: 'richtext', label })

/**
 * Product cells in a joined grid: square photograph wells, name, seller and price from the projection, then
 * the cell's stock state and the comparison toggle. Columns follow the grid's own width.
 */
export function ProductGrid({ products, compare = true }: { products: readonly ProductRecord[]; compare?: boolean }) {
  return (
    <div className="@container">
      <ul className="grid grid-cols-2 border-t border-l border-border @2xl:grid-cols-3 @5xl:grid-cols-4">
        {products.map(p => (
          <li key={p.id} className="flex flex-col border-r border-b border-border bg-surface">
            <Projection meta={ProductMeta} record={p} context="list" override={{ intent: 'media', surface: 'flat' }} href={productHref(p)} className="w-full flex-1" />
            {compare ? (
              <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 px-3 pb-2">
                {p.in_stock ? <span /> : <Stamp tone="danger" condition="unavailable" size="sm">Out of stock</Stamp>}
                <CompareToggle product={{ id: p.id, name: p.name, category: p.category.id, categoryLabel: p.category.label }} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The product list's metadata with a category contract's buyer filters (`attr.<key>`) added. */
export function listingMeta(facets: readonly FieldMeta[] = []): ModelMeta {
  const base = ProductMeta as unknown as ModelMeta
  return { ...base, fields: [...base.fields, ...facets] }
}

/**
 * A filterable, sortable, paged product list. Filters sit beside the grid on wide containers and in a sheet
 * on narrow ones; sort and page size sit above it, previous and next below. Everything reads and writes
 * the URL, so the server rendered exactly this page and a link to it shows the same products.
 */
export function ProductListing({ meta, fields, page, options, clearHref }: {
  meta: ModelMeta
  fields: readonly string[]
  page: ListPage<ProductRecord>
  options?: Record<string, readonly ComboOption[]>
  clearHref: Route
}) {
  const filters = (layout: 'sidebar' | 'sheet') => <FacetFilterPanel meta={meta} fields={fields} facets={page.facets} options={options} layout={layout} />
  return (
    <div className="grid grid-cols-1 gap-8 @5xl:grid-cols-[16.5rem_minmax(0,1fr)] @5xl:gap-12">
      <div className="hidden @5xl:block">{filters('sidebar')}</div>
      <section aria-label="Products" className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-foreground pb-3">
          <p className="text-md" aria-live="polite"><b className="font-semibold tabular">{page.total.toLocaleString('en-KE')}{page.totalCapped ? '+' : ''}</b> {page.total === 1 ? 'product' : 'products'}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2"><UrlSort meta={meta} /><UrlPageSize meta={meta} /></div>
        </div>
        <div className="@5xl:hidden">{filters('sheet')}</div>
        {page.results.length ? <ProductGrid products={page.results} /> : (
          <EmptyState kind="no-results" title="No products match" description="Remove a filter, widen the price range or search for something else."
            action={<Link href={clearHref} className={buttonStyles({ variant: 'secondary' })}>Clear search and filters</Link>} />
        )}
        <UrlPager page={page} noun={{ one: 'product', other: 'products' }} />
      </section>
    </div>
  )
}

const LIST_FILTERS = ['seller', 'unit_price', 'in_stock'] as const
const facetNames = (facets: readonly FieldMeta[]) => facets.map(f => f.name)

/**
 * The whole catalogue: every published product with search, category, seller, price and stock filters.
 * When exactly one category is chosen its contract's buyer filters join them.
 */
export function CatalogueListing({ categories, page, chosen }: { categories: readonly CategoryRecord[]; page: ListPage<ProductRecord>; chosen?: CategoryRecord }) {
  const live = categories.filter(c => c.product_count > 0)
  const facets = chosen?.contract?.facets ?? []
  const options = { category: live.map(c => ({ value: c.id, label: c.name, description: `${c.product_count} products` })) }
  const sellers = new Set(page.facets?.options.seller.map(s => s.value)).size
  return (
    <div className="@container flex flex-col gap-10">
      <header className="flex flex-col gap-5">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Catalogue' }]} />
        <div className="grid grid-cols-1 items-end gap-6 @4xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-extrabold tracking-display @5xl:text-5xl">Catalogue</h1>
            <p className="max-w-[60ch] text-lg text-muted">Wholesale stock from {sellers || 'the'} approved Kenyan sellers, priced per pack in KES. Filter by what matters to your shop, then compare up to four products side by side.</p>
          </div>
        </div>
        <nav aria-label="Categories" className="flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3 text-md">
          {live.map(c => <Link key={c.id} href={categoryHref(c)} className="font-medium hover:text-primary hover:underline">{c.name} <span className="text-muted tabular">{c.product_count}</span></Link>)}
        </nav>
      </header>
      <ProductListing meta={listingMeta(facets)} fields={['category', ...facetNames(facets), ...LIST_FILTERS]} page={page} options={options} clearHref="/catalogue" />
    </div>
  )
}

function Guide({ title, value }: { title: string; value: RichValue }) {
  if (!value.text.trim()) return null
  return (
    <aside className="flex flex-col gap-1.5 border-l-[length:var(--border-stamp)] border-signal-border bg-signal-soft px-4 py-3 text-md">
      <span className="font-semibold">{title}</span>
      <RichTextView field={guide('guide', title)} value={value} context="comfortable" />
    </aside>
  )
}

/** One category: its hero, its buying guide, and its products with the contract's own filters. */
export function CategoryPage({ category, page }: { category: CategoryRecord; page: ListPage<ProductRecord> }) {
  const facets = category.contract?.facets ?? []
  return (
    <div className="@container flex flex-col gap-10">
      <CategoryHero title={category.name} description={category.description} count={category.product_count} sellers={page.facets?.options.seller.length} scene={sceneFor(category.slug)}
        breadcrumbs={<Breadcrumbs items={[{ label: 'Catalogue', href: '/catalogue' }, { label: category.name }]} />} />
      {category.contract ? <Guide title={`Buying ${category.name.toLowerCase()}`} value={category.contract.buyer_guidance} /> : null}
      <ProductListing meta={listingMeta(facets)} fields={[...facetNames(facets), ...LIST_FILTERS]} page={page} clearHref={categoryHref(category)} />
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-0.5 py-3"><dt className="text-sm text-muted">{label}</dt><dd className="font-medium">{children}</dd></div>
}

/**
 * Product page in two columns (after Not Another Bill): the photographs on the left, the buying column held
 * in view on the right with every pack on sale, then the listing, its specifications and related products.
 */
export function ProductDetail({ product: p, related }: { product: ProductDetailRecord; related: readonly ProductRecord[] }) {
  // The cut-out first (on the well), then the seller's photographs (filling the frame).
  const photos: GalleryImage[] = [
    ...(p.primary_image ? [{ ...p.primary_image, fit: 'contain' as const }] : []),
    ...(p.gallery ?? []).map(g => ({ ...g, fit: 'cover' as const })),
  ]
  return (
    <div className="@container flex flex-col gap-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(p.page.structured_data_json).replace(/</g, '\\u003c') }} />
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={p.page.breadcrumb_items} />
        <div className="grid grid-cols-1 items-start gap-8 @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @4xl:gap-12">
          <ProductGallery images={photos} name={p.name} />
          <aside className="flex flex-col gap-6 @4xl:sticky @4xl:top-40" aria-label="Packs, price and ordering">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted">{p.brand ? `${p.brand} · ` : ''}{p.seller.label}{p.seller.detail ? `, ${p.seller.detail}` : ''}</span>
              <h1 className="text-3xl font-extrabold tracking-display @5xl:text-4xl">{p.name}</h1>
              {p.short_description ? <p className="max-w-[52ch] text-md text-muted">{p.short_description}</p> : null}
            </div>
            {p.unit_price ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-border py-4">
                <span className="text-md text-muted">From</span>
                <span className="font-display text-4xl font-extrabold tabular">{formatMoney(p.unit_price)}</span>
                <span className="text-md text-muted">per pack{p.variants.length > 1 ? `, ${p.variants.length} packs to choose from` : ''}</span>
              </div>
            ) : null}
            <BuyBox variants={p.variants} productName={p.name} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              {p.contract.comparable ? <CompareToggle product={{ id: p.id, name: p.name, category: p.category.id, categoryLabel: p.category.label }} /> : <span />}
              {p.seller.phone ? (
                <a href={`tel:${p.seller.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-md font-semibold text-primary underline-offset-2 hover:underline">
                  <Icon icon={Phone} />Ask {p.seller.label}: {formatPhone(p.seller.phone)}
                </a>
              ) : null}
            </div>
            {p.specs.length ? (
              <dl className="grid grid-cols-2 divide-y divide-border border-y border-border [&>*:nth-child(odd)]:pr-3">
                {p.specs.map(s => <Fact key={s.key} label={s.label}>{s.value}</Fact>)}
                <Fact label="Category"><Link href={categoryHref(p.category)} className="text-primary hover:underline">{p.category.label}</Link></Fact>
              </dl>
            ) : null}
          </aside>
        </div>
      </div>
      <section aria-labelledby="about-title" className="grid grid-cols-1 gap-6 border-t border-foreground pt-8 @4xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <h2 id="about-title" className="text-2xl font-semibold">About this product</h2>
        <div className="flex flex-col gap-8">
          <div className="text-lg"><RichTextView field={ProductMeta.fields.find(f => f.name === 'description')!} value={p.description} context="spacious" /></div>
          <Guide title={`Buying ${p.category.label.toLowerCase()}`} value={p.contract.buyer_guidance} />
        </div>
      </section>
      {related.length ? (
        <section aria-labelledby="related-title" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="related-title" className="text-3xl font-semibold">More in {p.category.label}</h2>
            <Link href={categoryHref(p.category)} className="text-md font-semibold text-primary hover:underline">All of {p.category.label}</Link>
          </div>
          <ProductGrid products={related.slice(0, 4)} />
        </section>
      ) : null}
    </div>
  )
}

/** Comparison (SM-F-09): the API's projection, with each product's cheapest pack ready to add to the cart. */
export function ComparePage({ state }: { state: ComparisonRecord }) {
  const products: CompareProduct[] = state.products.map(p => ({
    id: p.id, name: p.name, seller: p.seller, href: `/products/${p.slug}` as Route, image: p.image ?? undefined,
    unitPrice: p.unit_price, unit: p.unit, normalisedPrice: p.normalised_price ?? undefined, stock: stockFrom(p.stock), values: p.values,
    action: (
      <AddToCart compact productName={p.name} variant={{
        id: p.variant.id, sku: p.variant.sku, pack_label: p.unit, packaging_unit: p.stock.unit, units_per_pack: '1', moq: p.variant.moq,
        unit_price: p.unit_price, normalised_price: p.normalised_price, stock: p.stock, is_active: true, attributes: {}, details: [],
      }} />
    ),
  }))
  return (
    <div className="@container flex flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-foreground pb-6">
        <Breadcrumbs items={[{ label: 'Catalogue', href: '/catalogue' }, ...(state.category ? [{ label: state.category.label, href: `/catalogue/${state.category.slug}` }] : []), { label: 'Compare' }]} />
        <h1 className="text-4xl font-extrabold tracking-display">Compare {state.category?.label.toLowerCase() ?? 'products'}</h1>
        <p className="max-w-[64ch] text-md text-muted">
          Rows come from the {state.category_contract ? `${state.category_contract.name} contract (version ${state.category_contract.version})` : 'category contract'}. {state.price_context.basis}{state.price_context.normalised_per ? `, also per ${state.price_context.normalised_per}` : ''}, as of {new Date(state.price_context.as_of).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' })}.
        </p>
        {state.unavailable_ids.length ? <p className="text-md text-tone-warning">{state.unavailable_ids.length === 1 ? 'One product you picked is' : `${state.unavailable_ids.length} products you picked are`} no longer on sale and left out.</p> : null}
      </header>
      {products.length >= 2 ? <ProductComparisonBlock products={products} fields={state.fields} /> : (
        <EmptyState kind="no-data" title="Pick at least two products" description="Use Compare on the products you are weighing up, then come back here."
          action={<Link href={state.category ? (`/catalogue/${state.category.slug}` as Route) : '/catalogue'} className={buttonStyles({ variant: 'primary' })}>Browse {state.category?.label ?? 'the catalogue'}</Link>} />
      )}
    </div>
  )
}
