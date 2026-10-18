'use client'

import { useState, type ReactNode } from 'react'
import { PaymentStatusPanel } from '@/components/commerce/checkout'
import { PriceTierTable } from '@/components/commerce/pricing'
import { InventoryLedgerBlock, ReservationCountdown, ReservationIndicator, StockAvailabilityIndicator } from '@/components/commerce/stock'
import { Projection } from '@/components/kernel/Projection'
import { Thread } from '@/components/ui/thread'
import { Segmented } from '@/components/ui/choice'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { CategoryContractBuilder, attributeToField, type Attribute, type ContractDraft } from '@/features/categories/CategoryContractBuilder'
import { VariantMeta } from '@/lib/contract/generated'
import { ProductComparisonBlock, type CompareProduct } from '@/features/comparison/ProductComparisonBlock'
import { FulfillmentPickPackBlock, type PickLine } from '@/features/fulfillment/FulfillmentPickPackBlock'
import { CategoryShowcase, MarketingCTA, MarketingFooter, MercantileHero, ProductRail as MarketingProductRail, StorySplit, buyerValue, sellerValue, statementCopy, heroPanels, TradeRibbon, TradeStatement, WholesaleMetricsStrip, cta, type HeroEmphasis } from '@/features/marketing/Marketing'
import { BuyerSellerValueSplit, InventoryTrustProof, MarketingHeader, MarketMeshVisualization, TradeFlowStory, type MeshRecord } from '@/features/marketing/MarketingInteractive'
import { DEMO_NOW, images, productMeta, products, scenes, sellers, stockFor } from '../fixtures'
import { Plate, Plates } from '../kit'

export const maizeContract: Attribute[] = [
  { key: 'pack_size', label: 'Pack size', type: 'enum', required: true, facet: true, comparable: true, card: true, choices: [{ value: '1kg', label: '1 kg' }, { value: '2kg', label: '2 kg' }, { value: '5kg', label: '5 kg' }] },
  { key: 'fortified', label: 'Fortified', type: 'boolean', required: false, facet: true, comparable: true },
  { key: 'net_weight', label: 'Bale net weight', type: 'decimal', unit: 'kg', required: true, facet: false, comparable: true },
  { key: 'mill', label: 'Mill', type: 'string', required: false, facet: false, comparable: true },
  { key: 'shelf_life_months', label: 'Shelf life', type: 'integer', unit: 'months', required: false, facet: false, comparable: true },
]

/** The marketplace's packaging units, from the contract (the variant field's choices). */
export const contractUnits = (VariantMeta.fields.find(f => f.name === 'packaging_unit')?.choices ?? []).map(c => ({ value: c.value, label: c.label }))
export const maizeDraft: ContractDraft = {
  name: 'Flour & grains',
  attributes: maizeContract,
  saleUnits: ['bale', 'sack'],
  normalise: { attribute: 'net_weight', per: 'kg', factor: '1' },
  sellerGuidance: { html: '<p>List each packet size as its own product; tick <strong>Fortified</strong> only with the KEBS logo.</p>', text: 'List each packet size as its own product; tick Fortified only with the KEBS logo.' },
  buyerGuidance: { html: '<p>Compare prices per kg: bales of 12 × 2 kg and 24 × 1 kg both weigh 24 kg.</p>', text: 'Compare prices per kg: bales of 12 × 2 kg and 24 × 1 kg both weigh 24 kg.' },
}
const saved = async () => ({ ok: true as const })

function Builder() {
  return (
    <Plates cols={1}>
      <Plate label="draft: editable, saved through the API, with live derived surfaces"><CategoryContractBuilder category="Flour & grains" version={3} status="draft" initial={maizeDraft} units={contractUnits} onSave={saved} /></Plate>
      <Plate label="published: read-only" note="Start a new draft to change a category"><CategoryContractBuilder category="Flour & grains" version={2} status="published" initial={maizeDraft} units={contractUnits} /></Plate>
    </Plates>
  )
}

export const compareProducts: CompareProduct[] = [
  { id: 'c1', name: 'Mavuno Maize Flour 2 kg', seller: sellers.mwangaza.label, image: images.maize, unitPrice: '1740.00', unit: 'bale', normalisedPrice: { amount: '72.50', per: 'kg' }, stock: stockFor['p-mvn-2k']!, values: { pack_size: '2kg', fortified: true, net_weight: '24.00', mill: 'Nakuru', shelf_life_months: 6 } },
  { id: 'c2', name: 'Shamba Maize Flour 2 kg', seller: sellers.rift.label, image: images.flour, unitPrice: '1650.00', unit: 'bale', normalisedPrice: { amount: '68.75', per: 'kg' }, stock: stockFor['p-skb-1k']!, values: { pack_size: '2kg', fortified: false, net_weight: '24.00', mill: null, shelf_life_months: 4 } },
  { id: 'c3', name: 'Nafaka Sifted Maize Meal 5 kg', seller: sellers.lakeside.label, image: images.rice, unitPrice: '1420.00', unit: 'bale', normalisedPrice: { amount: '71.00', per: 'kg' }, stock: stockFor['p-jua-3l']!, values: { pack_size: '5kg', fortified: true, net_weight: '20.00', mill: 'Kisumu', shelf_life_months: null } },
]
const fourth: CompareProduct = { id: 'c4', name: 'Pwani Maize Meal 1 kg', seller: sellers.pwani.label, image: images.flour, unitPrice: '1860.00', unit: 'bale', normalisedPrice: { amount: '77.50', per: 'kg' }, stock: stockFor['p-sfi-800']!, values: { pack_size: '1kg', fortified: true, net_weight: '24.00', mill: 'Mombasa', shelf_life_months: 5 } }

/** The category contract's comparable attributes, as field metadata (what the backend would emit). */
export const comparisonFields = maizeContract.filter(a => a.comparable).map(attributeToField)

function Comparison() {
  const fields = comparisonFields
  return (
    <Plates cols={1}>
      <Plate label="2 products"><ProductComparisonBlock products={compareProducts.slice(0, 2)} fields={fields} /></Plate>
      <Plate label="3 products, missing values stated, normalised per kg"><ProductComparisonBlock products={compareProducts} fields={fields} /></Plate>
      <Plate label="4 products" note="The widest layout the spec defines; labels stay sticky as the row scrolls"><ProductComparisonBlock products={[...compareProducts, fourth]} fields={fields} /></Plate>
    </Plates>
  )
}

export const pickLines: PickLine[] = [
  { id: 'p1', bin: 'C-04', product: 'Mavuno Maize Flour 2 kg', sku: 'MVN-2K-12', barcode: '6161100100014', ordered: 24, unit: 'bale', onShelf: 96 },
  { id: 'p2', bin: 'C-11', product: 'Sukari Bora Sugar 1 kg', sku: 'SKB-1K-24', barcode: '6161100200028', ordered: 12, unit: 'bale', onShelf: 9, substitutable: 'Sukari Bora Sugar 2 kg × 6 (same weight)' },
  { id: 'p3', bin: 'D-02', product: 'Mwea Pishori Rice 25 kg', sku: 'MWP-25K-01', barcode: '6161100300031', ordered: 4, unit: 'sack', onShelf: 6 },
]

function PickPack() {
  return <Plates cols={1}><Plate label="Pick, pack, hand over" note="Try scanning 6161100100014"><div className="max-w-2xl"><FulfillmentPickPackBlock order="SM-ORD-004215 · Wanjiru General Stores" lines={pickLines} /></div></Plate></Plates>
}

function Header() {
  return (
    <Plates cols={1}>
      <Plate label="buyer emphasis, with the category row" tone="canvas"><MarketingHeader emphasis="buyer" categories={categories} /></Plate>
      <Plate label="seller emphasis" tone="canvas"><MarketingHeader emphasis="seller" /></Plate>
    </Plates>
  )
}

export { heroPanels }

/** The landing's product row with fixture products (the live page passes published products). */
export function ProductRail({ title = 'Restock this week', records = products.slice(0, 4) }: { title?: string; records?: typeof products }) {
  return <MarketingProductRail title={title} meta={productMeta} records={records} href={() => '#product'} all={{ label: 'All products', href: '#products' }} now={DEMO_NOW} />
}

/** The hero's market: four product cells from the real projection, and the hold one buyer has on the first. */
export function MarketShelf() {
  return (
    <div className="flex flex-col border border-border-strong bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 text-sm">
        <span className="font-semibold">Demo market, Rift Valley</span>
        <span className="text-muted tabular">Prices and stock at {formatTime(DEMO_NOW)}</span>
      </div>
      <ul className="grid grid-cols-2" data-density="compact">
        {products.slice(0, 4).map((p, i) => (
          <li key={p.id} className={cn('flex border-border', i % 2 === 0 && 'border-r', i < 2 && 'border-b')}>
            <Projection meta={productMeta} record={p} context="list" override={{ intent: 'media', surface: 'flat', density: 'compact' }} now={DEMO_NOW} className="w-full" />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-signal-border bg-signal-soft px-4 py-3 text-sm">
        <ReservationIndicator reservation={{ id: 'RSV-88213', quantity: 24, unit: 'bale', status: 'active', expiresAt: '2026-10-12T11:52:00+03:00', product: 'Mavuno Maize Flour 2 kg' }} />
        <span>for Wanjiru General Stores while they pay</span>
      </div>
    </div>
  )
}

function Hero() {
  const [emphasis, setEmphasis] = useState<HeroEmphasis>('default')
  return (
    <Plates cols={1}>
      <Plate label="photo split: two doors" note="Unsplash photographs, graded; credits under the ledger" tone="canvas"><MercantileHero panels={heroPanels} /></Plate>
      <Plate label="emphasis, with the live shelf" tone="canvas">
        <div className="mb-2"><Segmented label="Emphasis" size="sm" value={emphasis} onValueChange={setEmphasis} items={[{ value: 'default', label: 'Default' }, { value: 'buyer', label: 'Buyer' }, { value: 'seller', label: 'Seller' }]} /></div>
        <div className="px-2"><MercantileHero emphasis={emphasis} board={<MarketShelf />} /></div>
      </Plate>
      <Plate label="compact" tone="canvas"><MercantileHero emphasis="buyer" compact /></Plate>
    </Plates>
  )
}

/** One product's record as the demo seed tells it: received, listed, held, paid, handed over. */
export const meshRecord: MeshRecord = {
  product: { name: 'Mavuno Maize Flour 2 kg', listing: 'Mwangaza Wholesalers Ltd, sold by the bale of 12 × 2 kg', image: { src: images.maize.url, width: images.maize.width, height: images.maize.height } },
  unit: 'bale',
  stations: [
    { key: 'sellers', label: 'Sellers', figure: '4 wholesalers', role: 'Receive stock into the record and set its price.',
      entry: { label: 'Received', reference: 'GRN-3302', detail: 'Peter Kamau, Mwangaza store in Nakuru', at: '10 Oct, 07:40', change: 120, available: 120 } },
    { key: 'catalogue', label: 'Catalogue', figure: '2 category contracts', role: 'Decide what a listing must say before it goes live.',
      entry: { label: 'Published', detail: 'Under the Maize flour v3 contract by Faith Chebet', at: '11 Oct, 16:00', available: 120 } },
    { key: 'buyers', label: 'Buyers', figure: '2 retail shops', role: 'Hold stock for 15 minutes while they pay.',
      entry: { label: 'Held at checkout', reference: 'RSV-88213', detail: 'Wanjiru General Stores, for 15 minutes', at: '12 Oct, 11:22', change: -24, available: 96 } },
    { key: 'orders', label: 'Orders', figure: 'One change per event', role: 'Turn a paid hold into a sale, exactly once.',
      entry: { label: 'Paid and confirmed', reference: 'SM-ORD-004215', detail: 'M-Pesa through SellaPay, applied once', at: '12 Oct, 11:30', available: 96 } },
    { key: 'fulfilment', label: 'Fulfilment', figure: 'Pick, pack, hand over', role: 'Record each handover against the order.',
      entry: { label: 'Handed over', detail: 'To Rift Express, expected 12:00 to 14:00', at: '12 Oct, 11:50', available: 96 } },
  ],
}

function Mesh() {
  return (
    <Plates cols={1}>
      <Plate label="animated (entries rise in once)" tone="canvas"><MarketMeshVisualization record={meshRecord} mode="animated" /></Plate>
      <Plate label="static" tone="canvas"><MarketMeshVisualization record={meshRecord} mode="static" /></Plate>
      <Plate label="reduced motion, narrow" tone="canvas"><div className="max-w-md"><MarketMeshVisualization record={meshRecord} mode="reduced-motion" /></div></Plate>
    </Plates>
  )
}

// The category name is the link text, so the photograph is decorative here.
export const categories = [
  { key: 'flour', name: 'Flour & grains', products: 64, image: images.maize.url, alt: '', scene: scenes['category-grains'] },
  { key: 'sugar', name: 'Sugar & sweeteners', products: 18, image: images.sugar.url, alt: '', scene: scenes['category-sugar'] },
  { key: 'oils', name: 'Cooking oils', products: 22, image: images.oil.url, alt: '', scene: scenes['category-oil'] },
  { key: 'tea', name: 'Tea & beverages', products: 15, image: images.tea.url, alt: '', scene: scenes['category-tea'] },
  { key: 'household', name: 'Household & cleaning', products: 31, image: images.soap.url, alt: '', scene: scenes['category-household'] },
  { key: 'dairy', name: 'Dairy', products: 9, image: images.milk.url, alt: '', scene: scenes['category-dairy'] },
]

function Categories() {
  return (
    <Plates cols={1}>
      <Plate label="photo" note="Scene photographs; product counts are demo data" tone="canvas"><CategoryShowcase categories={categories} layout="photo" /></Plate>
      <Plate label="grid" note="Product cut-outs on the well" tone="canvas"><CategoryShowcase categories={categories} /></Plate>
      <Plate label="carousel" tone="canvas"><CategoryShowcase categories={categories} layout="carousel" /></Plate>
      <Plate label="stacked" tone="canvas"><div className="max-w-md"><CategoryShowcase categories={categories.slice(0, 4)} layout="stacked" /></div></Plate>
    </Plates>
  )
}

export { buyerValue, sellerValue }

function ValueSplit() {
  return <Plates cols={1}><Plate label="stories" note="A photograph per side, left then right" tone="canvas"><BuyerSellerValueSplit layout="stories" buyer={buyerValue} seller={sellerValue} scenes={{ buyer: scenes['story-delivery'], seller: scenes['story-stock'] }} /></Plate><Plate label="split"><BuyerSellerValueSplit buyer={buyerValue} seller={sellerValue} /></Plate><Plate label="tabs"><BuyerSellerValueSplit layout="tabs" buyer={buyerValue} seller={sellerValue} /></Plate></Plates>
}

export function flowSteps() {
  return [
    { key: 'discover' as const, title: 'Discover', body: 'Search permitted products with filters from the category.', example: <div className="max-w-xs"><Projection meta={productMeta} record={products[0]!} context="list" now={DEMO_NOW} /></div> },
    { key: 'compare' as const, title: 'Compare', body: 'See your price by quantity before you commit.', example: <PriceTierTable tiers={[{ minQuantity: 5, maxQuantity: 9, unitPrice: '1740.00' }, { minQuantity: 10, maxQuantity: 49, unitPrice: '1690.00' }, { minQuantity: 50, unitPrice: '1640.00' }]} unit="bale" quantity={20} /> },
    { key: 'order' as const, title: 'Order', body: 'Stock is reserved while you pay by M-Pesa.', example: <ReservationCountdown expiresAt="2026-10-12T11:52:00+03:00" totalSeconds={900} pausedAt="2026-10-12T11:41:00+03:00" /> },
    { key: 'fulfil' as const, title: 'Fulfil', body: 'Sellers pick, pack and hand over; you see each step.', example: <Thread label="Fulfilment" orientation="vertical" steps={[{ key: 'a', label: 'Confirmed by Mwangaza', state: 'done' }, { key: 'b', label: 'Picked 3 of 3 lines', state: 'done' }, { key: 'c', label: 'Handed to Rift Express', state: 'current', detail: 'Expected 12:00 to 14:00' }, { key: 'd', label: 'Delivered', state: 'upcoming' }]} /> },
  ]
}

function Flow() {
  return <Plates cols={1}><Plate label="Discover, compare, order, fulfil"><TradeFlowStory steps={flowSteps()} /></Plate></Plates>
}

export function trustProofs() {
  return {
    stock: { title: 'Stock is the sum of its movements', body: 'Available units are calculated from receipts, holds, releases and shipments, never typed in.', example: <InventoryLedgerBlock unit="bale" now={DEMO_NOW} movements={[
      { id: 'a', type: 'reservation', quantity: -24, unit: 'bale', balanceAfter: 96, at: '2026-10-12T11:22:00+03:00', actor: 'Checkout', reference: 'RSV-88213' },
      { id: 'b', type: 'release', quantity: 12, unit: 'bale', balanceAfter: 120, at: '2026-10-12T10:58:00+03:00', actor: 'Expiry worker', reference: 'RSV-88190', reason: 'Hold expired' },
      { id: 'c', type: 'receipt', quantity: 120, unit: 'bale', balanceAfter: 108, at: '2026-10-10T07:40:00+03:00', actor: 'Peter Kamau', reference: 'GRN-3302' },
    ]} /> },
    reservation: { title: 'The first hold wins; the second buyer gets a way forward', body: 'Reservations lock the stock row inside one transaction, so two checkouts can never sell the same bales.', example: (
      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
        <div className="flex flex-col gap-2 bg-surface p-3"><span className="text-sm font-semibold">Wanjiru General Stores · 11:22:03</span><ReservationIndicator reservation={{ id: 'RSV-88213', quantity: 24, unit: 'bale', status: 'active', expiresAt: '2026-10-12T11:37:03+03:00', product: 'Mavuno Maize Flour 2 kg' }} variant="full" /></div>
        <div className="flex flex-col gap-2 bg-surface p-3"><span className="text-sm font-semibold">Baraka Mini-Mart · 11:22:04</span><StockAvailabilityIndicator stock={{ state: 'out-of-stock', available: 0, unit: 'bale', restockOn: '2026-10-15T09:00:00+03:00' }} variant="full" /></div>
      </div>
    ) },
    payment: { title: 'A payment changes the order once', body: 'Repeated confirmations for the same transaction are recorded and ignored, never applied twice.', example: <PaymentStatusPanel state="reconciled" amount="48250.00" orderReference="SM-ORD-004215" transactionId="TXN-1770727500-12345" sentAt="2026-10-12T11:30:00+03:00" confirmations={2} /> },
  }
}

function Trust() {
  return <Plates cols={1}><Plate label="stock, reservation, payment"><InventoryTrustProof proofs={trustProofs()} /></Plate></Plates>
}

/** Terms that are properties of the product (PRODUCT.md), so they need no source line. */
export const tradeTerms = [
  { label: 'Prices', value: 'KES', note: 'Every price, fee and total' },
  { label: 'Payment', value: 'M-Pesa', note: 'STK push through SellaPay' },
  { label: 'Stock hold at checkout', value: '15 min', note: 'Reserved while you pay' },
  { label: 'Times', value: 'EAT', note: 'Africa/Nairobi, on every record' },
]
const demoCounts = [
  { label: 'Sellers', value: '4', note: 'Nakuru, Eldoret, Mombasa, Kisumu' },
  { label: 'Category contracts', value: '2', note: 'Flour & grains, household' },
  { label: 'Buyers', value: '2', note: 'Retail shops' },
]

function Metrics() {
  return (
    <Plates cols={1}>
      <Plate label="full, terms of trade"><WholesaleMetricsStrip metrics={tradeTerms} label="Terms of trade" /></Plate>
      <Plate label="compact, counted figures with their source"><WholesaleMetricsStrip metrics={demoCounts} compact label="Demo market" source="Demo seed data, not trading results." /></Plate>
    </Plates>
  )
}

function CTA() {
  return (
    <Plates cols={1}>
      <Plate label="dual, with photograph" tone="canvas"><MarketingCTA scene={scenes['story-road']} /></Plate>
      <Plate label="dual · full" tone="canvas"><MarketingCTA /></Plate>
      <Plate label="buyer · compact" tone="canvas"><MarketingCTA audience="buyer" size="compact" /></Plate>
      <Plate label="seller · compact" tone="canvas"><MarketingCTA audience="seller" size="compact" /></Plate>
    </Plates>
  )
}

function Ribbon() {
  return (
    <Plates cols={1}>
      <Plate label="on a light ground, behind a grid" tone="canvas">
        <div className="relative isolate">
          <div className="grid grid-cols-3 border-t border-l border-border">{['Cell', 'Cell', 'Cell'].map((c, i) => <div key={i} className="h-24 border-r border-b border-border bg-surface p-3 text-sm text-muted">{c} {i + 1}</div>)}</div>
          <TradeRibbon className="relative -z-10 -mt-12 h-24" />
        </div>
      </Plate>
      <Plate label="on a dark ground" note="The forest strand lifts; the amber keeps its value" tone="canvas"><div className="on-chrome bg-chrome px-4 py-8"><TradeRibbon ground="brand" className="h-16" /></div></Plate>
    </Plates>
  )
}

function Story() {
  return (
    <Plates cols={1}>
      <Plate label="photo left, with a list and a link" tone="canvas"><StorySplit scene={scenes['story-delivery']} title="Deliveries that arrive on the day shown" body="Every seller states a dispatch day and a delivery fee before you pay, and the order record shows each handover." items={buyerValue.slice(0, 2)} link={cta.flow} /></Plate>
      <Plate label="photo right" tone="canvas"><StorySplit scene={scenes['story-stock']} side="right" title="Stock you can count on" body="Availability is the sum of receipts, holds, releases and shipments, so the figure a buyer sees is the figure in the store." /></Plate>
    </Plates>
  )
}

/** The statement, as on the landing page: the tagline with the oil bottle standing in front of it. */
export const statement = { ...statementCopy, product: { src: images.oil.url, width: images.oil.width, height: images.oil.height } }

function Statement() {
  return <Plates cols={1}><Plate label="tagline with a product in front" tone="canvas"><TradeStatement {...statement} link={cta.flow} /></Plate></Plates>
}

function Footer() {
  return <Plates cols={1}><Plate label="full" tone="canvas"><MarketingFooter /></Plate><Plate label="minimal" tone="canvas"><MarketingFooter variant="minimal" /></Plate></Plates>
}

const map: Record<string, () => ReactNode> = {
  'D-01': Builder, 'D-02': Comparison, 'D-03': PickPack,
  'M-14': () => <Plates cols={1}><Plate label="four products, with link" tone="canvas"><ProductRail /></Plate></Plates>,
  'M-01': Header, 'M-02': Hero, 'M-03': Mesh, 'M-04': Categories, 'M-05': ValueSplit, 'M-06': Flow, 'M-07': Trust, 'M-08': Metrics, 'M-09': CTA, 'M-10': Footer, 'M-11': Ribbon, 'M-12': Story, 'M-13': Statement,
}

export default function DivergentSpecimens({ code }: { code: string }) {
  const S = map[code]
  return S ? <S /> : null
}
