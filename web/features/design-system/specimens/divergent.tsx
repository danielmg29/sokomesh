'use client'

import { useState, type ReactNode } from 'react'
import { Projection } from '@/components/kernel/Projection'
import { CategoryContractBuilder, attributeToField, type Attribute, type ContractDraft } from '@/features/categories/CategoryContractBuilder'
import { VariantMeta } from '@/lib/contract/generated'
import { ProductComparisonBlock, type CompareProduct } from '@/features/comparison/ProductComparisonBlock'
import { FulfillmentPickPackBlock, type Pick, type PickLine, type TaskStatus } from '@/features/fulfillment/FulfillmentPickPackBlock'
import { CategoryShowcase, MarketingCTA, MarketingFooter, MercantileHero, ProductRail as MarketingProductRail, StorySplit, buyerValue, sellerValue, statementCopy, heroPanels, TradeRibbon, TradeStatement, WholesaleMetricsStrip, cta } from '@/features/marketing/Marketing'
import { BuyerSellerValueSplit, InventoryTrustProof, MarketingHeader, MarketMeshVisualization, TradeFlowStory, type MeshRecord } from '@/features/marketing/MarketingInteractive'
import { DEMO_NOW, images, productMeta, products, scenes, sellers, stockFor } from '../fixtures'
import { Plate, Plates } from '../kit'
import { flowSteps as storyFlow, meshRecord as storyMesh, trustProofs as storyProofs } from '@/features/marketing/stories'

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
  { id: 'p1', bin: 'C-04', product: 'Mavuno Maize Flour', packLabel: '12 × 2 kg bale', sku: 'MVN-2K-12', ordered: 24, unit: 'bale', onShelf: 96, picked: 0, outcome: 'pending' },
  { id: 'p2', bin: 'C-11', product: 'Sukari Bora Sugar', packLabel: '24 × 1 kg bale', sku: 'SKB-1K-24', ordered: 12, unit: 'bale', onShelf: 9, picked: 0, outcome: 'pending' },
  { id: 'p3', bin: 'D-02', product: 'Mwea Pishori Rice', packLabel: '25 kg sack', sku: 'MWP-25K-01', ordered: 4, unit: 'sack', onShelf: 6, picked: 0, outcome: 'pending' },
]

/** The block against a pretend pick list: each command answers after a moment, as the API would. */
export function PickPackDemo({ initial = 'queued' }: { initial?: TaskStatus }) {
  const [status, setStatus] = useState<TaskStatus>(initial)
  const [lines, setLines] = useState<PickLine[]>(pickLines)
  const [pending, setPending] = useState<string | null>(null)
  const later = (name: string, apply: () => void) => new Promise<void>(resolve => { setPending(name); setTimeout(() => { apply(); setPending(null); resolve() }, 500) })
  const record = (picks: Pick[]) => later('record_picks', () => {
    setStatus('picking')
    setLines(ls => ls.map(l => { const p = picks.find(x => x.line === l.id); return p ? { ...l, picked: p.picked, reason: p.reason, outcome: p.picked === l.ordered ? 'full' : p.picked === 0 ? 'rejected' : 'short' } : l }))
  })
  return (
    <FulfillmentPickPackBlock key={`${status}|${lines.map(l => l.outcome + l.picked).join()}`} order="SM-ORD-004215" status={status} lines={lines} buyer="Wanjiru General Stores"
      deliverTo="Kenyatta Avenue, Nakuru" instructions="Deliver before noon; the loading bay is at the back." pending={pending}
      onRecordPicks={record} onPack={() => later('pack', () => setStatus('packed'))} onHandOver={() => later('hand_over', () => setStatus('handed_over'))} />
  )
}

function PickPack() {
  return <Plates cols={1}><Plate label="Pick, pack, hand over" note="Try scanning MVN-2K-12"><div className="max-w-2xl"><PickPackDemo /></div></Plate></Plates>
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

function Hero() {
  return (
    <Plates cols={1}>
      <Plate label="photo split: two doors" note="Unsplash photographs, graded; credits under the ledger" tone="canvas"><MercantileHero panels={heroPanels} /></Plate>
      <Plate label="narrow: each photograph above its words" tone="canvas"><div className="max-w-md"><MercantileHero panels={heroPanels} /></div></Plate>
    </Plates>
  )
}

/** One product's record as the demo seed tells it: received, listed, held, paid, handed over. */
export const meshRecord: MeshRecord = storyMesh({
  name: 'Mavuno Maize Flour 2 kg', listing: 'Mwangaza Wholesalers Ltd, sold by the bale of 12 × 2 kg',
  image: { src: images.maize.url, width: images.maize.width, height: images.maize.height },
})

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

export const flowSteps = () => storyFlow(<Projection meta={productMeta} record={products[0]!} context="list" now={DEMO_NOW} />)

function Flow() {
  return <Plates cols={1}><Plate label="Discover, compare, order, fulfil"><TradeFlowStory steps={flowSteps()} /></Plate></Plates>
}

export const trustProofs = () => storyProofs(DEMO_NOW)

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
