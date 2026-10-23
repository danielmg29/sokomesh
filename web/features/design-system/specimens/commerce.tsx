'use client'

import { useState, type ReactNode } from 'react'
import { IntegrationPanel, ReconciliationChecksBlock, ReconciliationTraceBlock, SecretReveal, SellerAnalyticsGrid, type AnalyticsPeriod, type ApiToken, type ReconciliationCheck, type TraceEvent, type WebhookEndpoint } from '@/components/commerce/admin'
import { OrderPaymentBlock } from '@/components/commerce/payment'
import type { PaymentRecord, ReservationRecord, SandboxOutcome } from '@/lib/client/records'
import { ApprovalFlowBlock, CartBlock, QuoteDecisionPanel, QuoteRequestSheet, SellerCartGroup, type CartState, type QuoteStatus } from '@/components/commerce/cart'
import { AddToCart, BuyBox } from '@/components/commerce/buy'
import { CategoryDetailsForm, CategoryHero, FacetFilterPanel, MediaManager, ProductEditorBlock, SellerOnboardingReviewBlock, VariantMatrixEditor, type VariantRow } from '@/components/commerce/catalog'
import { CompareToggle, CompareTray } from '@/components/commerce/compare'
import type { VariantRecord } from '@/lib/client/records'
import { ProductGallery } from '@/components/commerce/gallery'
import { CheckoutSummaryBlock, PaymentStatusPanel, type PaymentState } from '@/components/commerce/checkout'
import { DeliveryTrackingBlock, OrderTimelineBlock, ReturnDisputeCaseBlock } from '@/components/commerce/orders'
import { PriceBookEditor, PriceTierTable, ReorderDiffBlock, type ReorderLine } from '@/components/commerce/pricing'
import { NotificationBell, NotificationPreferencesBlock, NotificationsBlock, type AppNotification, type NotificationPreference } from '@/components/commerce/notifications'
import { InventoryLedgerBlock, ReservationCountdown, ReservationIndicator, StockAvailabilityIndicator } from '@/components/commerce/stock'
import type { CartLine, InventoryMovement, Reservation, SellerGroup } from '@/components/commerce/types'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import type { SubmitResult } from '@/components/kernel/forms/ProjectedForm'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/choice'
import { ApiTokenMeta, QuoteMeta, ReturnCaseMeta, WebhookEndpointMeta, locales } from '@/lib/contract/generated'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { MemoryUrl } from '@/components/kernel/blocks/UrlListControls'
import type { FieldMeta, ModelMeta } from '@/lib/contract/types'
import { formatMoney } from '@/lib/money'
import { Breadcrumbs } from '@/components/kernel/nav/Breadcrumbs'
import { DEMO_NOW, buyers, images, people, productMeta, scenes, sellers, stockFor } from '../fixtures'
import { Plate, Plates } from '../kit'
import { sellerMetrics } from './blocks'

const ok = async (): Promise<SubmitResult> => { await new Promise(r => setTimeout(r, 700)); return { ok: true } }

export const sellerDocuments = [
  { type: 'Certificate of incorporation', file: { name: 'certificate-of-incorporation.pdf', size: 482_120, type: 'application/pdf', state: 'ready' as const, url: '#' }, status: 'verified' as const },
  { type: 'KRA PIN certificate', file: { name: 'kra-pin-certificate.pdf', size: 128_400, type: 'application/pdf', state: 'ready' as const, url: '#' }, status: 'verified' as const },
  { type: 'Single business permit', file: { name: 'nakuru-county-permit-2026.jpg', size: 1_840_000, type: 'image/jpeg', state: 'ready' as const, url: '#' }, status: 'pending' as const, expiresAt: '2026-12-31T23:59:00+03:00' },
  { type: 'Bank verification letter', file: { name: 'bank-letter.pdf', size: 96_000, type: 'application/pdf', state: 'restricted' as const }, status: 'expired' as const, notes: 'Letter older than 90 days' },
]

export const onboardingHistory = [{ status: 'draft' as const, at: '2026-10-02T09:00:00+03:00', by: people.faith }, { status: 'under_review' as const, at: '2026-10-05T14:10:00+03:00', by: people.faith }]

function Onboarding() {
  const docs = sellerDocuments
  return (
    <Plates cols={2}>
      <Plate label="under_review · decision available after verification" span><SellerOnboardingReviewBlock seller="Lakeside Supplies" location="Kisumu" status="under_review" documents={docs} history={onboardingHistory} blockers={['Verify the tax document first.']} /></Plate>
      <Plate label="active · suspend"><SellerOnboardingReviewBlock seller="Mwangaza Wholesalers Ltd" location="Nakuru" status="active" documents={docs.slice(0, 2)} history={[...onboardingHistory, { status: 'active', at: '2026-10-06T10:00:00+03:00', by: people.amina }]} /></Plate>
      <Plate label="rejected"><SellerOnboardingReviewBlock seller="Sunset Traders" location="Narok" status="rejected" reason="The business permit has expired; upload the 2026 permit." documents={docs.slice(3)} history={[...onboardingHistory, { status: 'rejected', at: '2026-10-07T12:00:00+03:00', by: people.amina, reason: 'Business permit expired' }]} /></Plate>
      <Plate label="suspended · reinstate after review"><SellerOnboardingReviewBlock seller="Rift Valley Traders" location="Eldoret" status="suspended" documents={docs.slice(0, 3)} history={[...onboardingHistory, { status: 'active', at: '2026-10-06T10:00:00+03:00', by: people.amina }, { status: 'suspended', at: '2026-10-11T15:30:00+03:00', by: people.amina }]} /></Plate>
    </Plates>
  )
}

export const maizeAttributes: FieldMeta[] = [
  { name: 'pack_size', type: 'enum', widget: 'select', label: 'Pack size', required: true, group: 'attributes', choices: [{ value: '1kg', label: '1 kg' }, { value: '2kg', label: '2 kg' }, { value: '5kg', label: '5 kg' }] },
  { name: 'fortified', type: 'boolean', widget: 'boolean', label: 'Fortified (vitamins and minerals)', group: 'attributes' },
  { name: 'net_weight', type: 'decimal', widget: 'decimal', label: 'Bale net weight', unit: 'kg', decimalPlaces: 2, maxDigits: 6, required: true, group: 'attributes' },
]
export const editorMeta: ModelMeta = {
  key: 'product', label: 'Product', displayField: 'name', list: productMeta.list,
  fields: [
    { name: 'name', type: 'string', widget: 'text', label: 'Product name', required: true, maxLength: 160, group: 'basics' },
    { name: 'brand', type: 'string', widget: 'text', label: 'Brand', maxLength: 80, group: 'basics' },
    { name: 'short_description', type: 'text', widget: 'textarea', label: 'Short description', maxLength: 280, group: 'basics' },
    ...maizeAttributes,
    { name: 'description', type: 'rich_text', widget: 'richtext', label: 'Description', maxLength: 4000, group: 'description', help: 'Shown on the public product page.' },
  ],
}

function ProductEditor() {
  return (
    <Plates cols={1}>
      <Plate label="mode=edit, inline, draft, publish blocked, with category details"><ProductEditorBlock meta={editorMeta} mode="edit" status="draft" category="Flour & grains (version 3)" fields={['name', 'brand', 'short_description', 'description']} initial={{ name: 'Mavuno Maize Flour 2 kg', brand: 'Mavuno' }} publishBlockers={['The marketplace has to approve your seller account first.', 'Add at least one variant that is on sale.']} actions={<Button size="sm" variant="primary" disabled>Publish</Button>} onSubmit={ok}>
        <CategoryDetailsForm fields={maizeAttributes} values={{ pack_size: '2kg', fortified: true }} guidance={{ html: '<p>Tick <strong>Fortified</strong> only if the packet carries the KEBS logo.</p>', text: 'Tick Fortified only if the packet carries the KEBS logo.' }} onSave={async () => ({ ok: true })} />
      </ProductEditorBlock></Plate>
      <Plate label="mode=create · stepper"><ProductEditorBlock meta={editorMeta} mode="create" layout="stepper" status="draft" category="Flour & grains · Maize flour v3" onSubmit={ok} /></Plate>
    </Plates>
  )
}

export const variantAttributes = [{ key: 'pack', label: 'Pack', options: ['1 kg', '2 kg', '5 kg'] }, { key: 'fortified', label: 'Fortified', options: ['Yes', 'No'] }]

export const variantRows: VariantRow[] = [
  { id: 'v1', sku: 'MVN-1K-24', attributes: { pack: '1 kg', fortified: 'Yes' }, packagingUnit: 'bale', unitsPerPack: '24', moq: '5', active: true },
  { id: 'v2', sku: 'MVN-2K-12', attributes: { pack: '2 kg', fortified: 'Yes' }, packagingUnit: 'bale', unitsPerPack: '12', moq: '5', active: true },
  { id: 'v3', sku: 'MVN-2K-12N', attributes: { pack: '2 kg', fortified: 'Yes' }, packagingUnit: 'bale', unitsPerPack: '12', moq: '5', active: false },
  { id: 'v4', sku: 'MVN-5K-04', attributes: { pack: '5 kg', fortified: 'No' }, packagingUnit: 'bale', unitsPerPack: '4', moq: '0', active: true },
]

const saleUnits = [{ value: 'bale', label: 'Bale' }, { value: 'sack', label: 'Sack' }]
const pricedRows: VariantRow[] = variantRows.map((r, i) => ({ ...r, price: ['1820.00', '1740.00', '1740.00', '1590.00'][i], stock: ['95', '180', '', '12'][i], packLabel: `Bale of ${r.unitsPerPack} × ${r.attributes.pack}` }))
const savedAll = async () => {
  await new Promise(r => setTimeout(r, 600))
  return {}
}

function Variants() {
  return (
    <Plates cols={1}>
      <Plate label="editable table · prices and stock · 2 invalid rows" note="Add a variant, edit a cell, then save"><VariantMatrixEditor attributes={variantAttributes} units={saleUnits} rows={pricedRows} onSave={savedAll} /></Plate>
      <Plate label="read-only table"><VariantMatrixEditor attributes={variantAttributes} rows={variantRows} /></Plate>
      <Plate label="cards"><VariantMatrixEditor attributes={variantAttributes} rows={pricedRows.slice(0, 2)} layout="cards" /></Plate>
      <Plate label="no variants yet"><VariantMatrixEditor attributes={[]} units={saleUnits} rows={[]} onSave={savedAll} /></Plate>
    </Plates>
  )
}

const stockOf = (state: VariantRecord['stock']['state'], available: number | null) => ({ state, available, unit: 'bale' })
export const buyVariants: VariantRecord[] = [
  { id: 'bv1', sku: 'MVN-2K-12', pack_label: 'Bale of 12 × 2 kg', packaging_unit: 'bale', units_per_pack: '12', moq: 5, unit_price: '1740.00', normalised_price: { amount: '72.50', per: 'kg' }, stock: stockOf('available', 180), is_active: true, attributes: {}, details: [] },
  { id: 'bv2', sku: 'MVN-2K-06', pack_label: 'Bale of 6 × 2 kg', packaging_unit: 'bale', units_per_pack: '6', moq: 10, unit_price: '890.00', normalised_price: { amount: '74.17', per: 'kg' }, stock: stockOf('limited', 24), is_active: true, attributes: {}, details: [] },
]

function Buy() {
  return (
    <Plates cols={2}>
      <Plate label="several packs" note="Signed in as a buyer it adds to the cart; otherwise it says why not"><BuyBox variants={buyVariants} productName="Mavuno Maize Flour 2 kg" /></Plate>
      <Plate label="one pack · compact add to cart"><AddToCart compact variant={buyVariants[0]!} productName="Mavuno Maize Flour 2 kg" /></Plate>
      <Plate label="out of stock"><BuyBox variants={[{ ...buyVariants[0]!, stock: stockOf('unavailable', 0) }]} productName="Magharibi Brown Sugar 2 kg" /></Plate>
    </Plates>
  )
}

function Compare() {
  const pick = (id: string, name: string, category = 'flour', label = 'Flour & grains') => ({ id, name, category, categoryLabel: label })
  return (
    <Plates cols={2}>
      <Plate label="toggles" note="Up to four, one category at a time">
        <div className="flex flex-col items-start gap-1">
          <CompareToggle product={pick('ds-1', 'Mavuno Maize Flour 2 kg')} />
          <CompareToggle product={pick('ds-2', 'Kati Highlands Maize Flour 2 kg')} />
          <CompareToggle product={pick('ds-3', 'Sukari Bora White Sugar 2 kg', 'sugar', 'Sugar & sweeteners')} />
        </div>
      </Plate>
      <Plate label="tray (inline here; fixed at the foot of storefront pages)"><CompareTray inline /></Plate>
    </Plates>
  )
}

function Details() {
  return (
    <Plates cols={1}>
      <Plate label="required missing · guidance beside"><CategoryDetailsForm fields={maizeAttributes} values={{}} guidance={{ html: '<p>Give the weight of one packet, not the bale.</p>', text: 'Give the weight of one packet, not the bale.' }} onSave={async () => ({ ok: false, detail: 'Some details need attention.', fields: {} })} /></Plate>
      <Plate label="read-only (archived product)"><CategoryDetailsForm fields={maizeAttributes} values={{ pack_size: '2kg', fortified: true }} /></Plate>
    </Plates>
  )
}

export const mediaItems = [
  { id: 'a', name: 'mavuno-flour.webp', url: images.maize.url, alt: 'Mavuno maize flour, a heap of the flour on a plate', size: 820_000, state: 'ready' as const },
  { id: 'b', name: 'mavuno-sifted.webp', url: images.flour.url, alt: '', size: 410_000, state: 'ready' as const },
  { id: 'c', name: 'mavuno-grain.jpg', url: images.rice.url, alt: 'Grain', size: 2_400_000, state: 'processing' as const },
  { id: 'd', name: 'mavuno-label.jpg', alt: '', size: 1_100_000, state: 'uploading' as const, progress: 46 },
  { id: 'e', name: 'mavuno-raw.heic', alt: '', size: 4_900_000, state: 'rejected' as const, reason: 'HEIC is not accepted' },
]

function Media() {
  return <Plates cols={1}><Plate label="grid, every item state, alt text required"><MediaManager items={mediaItems} maxBytes={10_485_760} /></Plate><Plate label="list · with remove"><MediaManager items={mediaItems.slice(0, 3)} layout="list" maxBytes={10_485_760} onRemove={() => undefined} /></Plate><Plate label="empty"><MediaManager items={[]} maxBytes={10_485_760} /></Plate></Plates>
}

export const tiers = [{ minQuantity: 5, maxQuantity: 9, unitPrice: '1740.00' }, { minQuantity: 10, maxQuantity: 49, unitPrice: '1690.00' }, { minQuantity: 50, unitPrice: '1640.00' }]

export const priceRules = [
  { id: 'r1', scope: 'base' as const, label: 'List price', unitPrice: '1740.00', effectiveFrom: '2026-09-01T00:00:00+03:00', state: 'active' as const, priority: 10 },
  { id: 'r2', scope: 'base' as const, label: 'January list price', unitPrice: '1795.00', effectiveFrom: '2027-01-01T00:00:00+03:00', state: 'future' as const, priority: 10 },
  { id: 'r3', scope: 'buyer-group' as const, label: 'Retail Partners (Rift Valley)', buyerGroup: '14 buyers', unitPrice: '1700.00', effectiveFrom: '2026-10-01T00:00:00+03:00', state: 'active' as const, priority: 20 },
  { id: 'r4', scope: 'buyer-group' as const, label: 'Harvest promotion', buyerGroup: 'Retail Partners (Rift Valley)', unitPrice: '1680.00', effectiveFrom: '2026-10-10T00:00:00+03:00', effectiveTo: '2026-10-31T23:59:00+03:00', state: 'conflict' as const, priority: 20, conflictNote: 'Same buyers, dates and priority as "Retail Partners (Rift Valley)".' },
  { id: 'r5', scope: 'quantity-tier' as const, label: 'Volume tiers', tiers, effectiveFrom: '2026-09-01T00:00:00+03:00', state: 'active' as const, priority: 30 },
  { id: 'r7', scope: 'quantity-tier' as const, label: 'Quantity price', detail: 'SKU MVN-2K-12 · from 50 bales', unitPrice: '1620.00', effectiveFrom: '2026-09-01T00:00:00+03:00', state: 'off' as const, priority: 0 },
  { id: 'r6', scope: 'base' as const, label: 'Old list price', unitPrice: '1650.00', effectiveFrom: '2026-01-01T00:00:00+03:00', effectiveTo: '2026-08-31T23:59:00+03:00', state: 'expired' as const, priority: 10 },
]

function PriceBook() {
  return <Plates cols={1}><Plate label="view, edit, conflict flagged"><PriceBookEditor rules={priceRules} unit="bale" product="Mavuno Maize Flour 2 kg" /></Plate></Plates>
}

function Tiers() {
  return (
    <Plates cols={2}>
      <Plate label="comfortable · buying 20 bales"><PriceTierTable tiers={tiers} unit="bale" quantity={20} explanation="Quantity tier 10 to 49 bales from the Mwangaza price book. Your buyer-group price (KES 1,700.00) is higher, so the tier applies." /></Plate>
      <Plate label="compact · repriced diff"><PriceTierTable tiers={tiers} unit="bale" quantity={6} density="compact" previous={[{ minQuantity: 5, maxQuantity: 9, unitPrice: '1700.00' }, { minQuantity: 10, maxQuantity: 49, unitPrice: '1690.00' }, { minQuantity: 50, unitPrice: '1620.00' }]} /></Plate>
    </Plates>
  )
}

export const movements: InventoryMovement[] = [
  { id: 'm9', type: 'reservation', quantity: -24, unit: 'bale', balanceAfter: 96, at: '2026-10-12T11:22:00+03:00', actor: 'Checkout', reference: 'RSV-88213' },
  { id: 'm8', type: 'release', quantity: 12, unit: 'bale', balanceAfter: 120, at: '2026-10-12T10:58:00+03:00', actor: 'Expiry worker', reference: 'RSV-88190', reason: 'Reservation expired after 15 minutes' },
  { id: 'm7', type: 'shipment', quantity: -40, unit: 'bale', balanceAfter: 108, at: '2026-10-12T08:30:00+03:00', actor: people.peter, reference: 'SHP-20441' },
  { id: 'm6', type: 'allocation', quantity: -40, unit: 'bale', balanceAfter: 148, at: '2026-10-11T16:05:00+03:00', actor: 'Order SM-ORD-004198', reference: 'SM-ORD-004198' },
  { id: 'm5', type: 'adjustment', quantity: -3, unit: 'bale', balanceAfter: 188, at: '2026-10-11T09:14:00+03:00', actor: people.faith, reference: 'ADJ-0117', reason: 'Water damage in bay C-04; photos attached' },
  { id: 'm4', type: 'receipt', quantity: 120, unit: 'bale', balanceAfter: 191, at: '2026-10-10T07:40:00+03:00', actor: people.peter, reference: 'GRN-3302', reason: 'Mill delivery, delivery note 55102' },
]

/**
 * A month of one product's ledger, oldest first in the making and newest first when shown, so the search,
 * movement chips and pages have rows to work through. Fixed tables, no randomness; the balance never goes
 * below zero because a movement that would empty the store becomes a receipt.
 */
const cycle = [
  { type: 'receipt', quantity: 120 }, { type: 'reservation', quantity: -24 }, { type: 'allocation', quantity: -24 }, { type: 'shipment', quantity: -40 },
  { type: 'release', quantity: 12 }, { type: 'reservation', quantity: -12 }, { type: 'adjustment', quantity: -2 }, { type: 'shipment', quantity: -36 },
] as const
const actorFor: Record<string, string> = { receipt: people.peter, reservation: 'Checkout', allocation: 'Order', shipment: people.peter, release: 'Expiry worker', adjustment: people.faith }
export const ledgerMonth: InventoryMovement[] = (() => {
  let balance = 40
  const rows: InventoryMovement[] = []
  for (let i = 0; i < 34; i++) {
    const step = balance + cycle[i % cycle.length]!.quantity < 0 ? cycle[0] : cycle[i % cycle.length]!
    balance += step.quantity
    const day = 12 + Math.floor(i * 30 / 34)
    const at = new Date(Date.UTC(2026, 8, day, 5 + ((i * 3) % 10), (i * 17) % 60)).toISOString().replace('.000Z', 'Z')
    const ref = { receipt: `GRN-${3200 + i}`, reservation: `RSV-${87900 + i * 7}`, allocation: `SM-ORD-00${4100 + i}`, shipment: `SHP-${20300 + i}`, release: `RSV-${87900 + i * 7 - 7}`, adjustment: `ADJ-0${100 + i}` }[step.type]
    rows.push({
      id: `lm-${i}`, type: step.type, quantity: step.quantity, unit: 'bale', balanceAfter: balance, at, reference: ref,
      actor: step.type === 'allocation' ? `Order ${ref}` : actorFor[step.type]!,
      reason: step.type === 'adjustment' ? 'Torn bales found at the count' : step.type === 'release' ? 'Hold expired after 15 minutes' : undefined,
    })
  }
  return rows.reverse()
})()

function Ledger() {
  return (
    <Plates cols={1}>
      <Plate label="compact · search, movement chips, pages" note="34 demo movements"><InventoryLedgerBlock movements={ledgerMonth} unit="bale" now={DEMO_NOW} /></Plate>
      <Plate label="one page"><InventoryLedgerBlock movements={movements} unit="bale" now={DEMO_NOW} /></Plate>
    </Plates>
  )
}

/** Spec order (SM-F-07): one cell per state, each fed by a fixture in that state. */
const stockStates = [['available', 'p-mvn-2k'], ['low', 'p-skb-1k'], ['reserved', 'p-mwp-25'], ['out of stock', 'p-jua-3l'], ['unknown', 'p-ubf-2k']] as const

function Stock() {
  return (
    <Plates cols={5}>
      {stockStates.map(([state, key]) => (
        <Plate key={state} label={state} note="compact, then full">
          <div className="flex flex-col items-start gap-3">
            <StockAvailabilityIndicator stock={stockFor[key]!} />
            <StockAvailabilityIndicator stock={stockFor[key]!} variant="full" />
          </div>
        </Plate>
      ))}
    </Plates>
  )
}

function Facets() {
  const facetMeta: ModelMeta = { ...productMeta, fields: [...productMeta.fields.filter(f => ['stock_status', 'unit_price', 'seller'].includes(f.name)), { ...maizeAttributes[0]!, filter: ['in'] }, { ...maizeAttributes[1]!, filter: ['eq'] }] }
  const counts = { pack_size: { '1kg': 18, '2kg': 41, '5kg': 6 }, stock_status: { available: 52, low: 9, reserved: 3, out_of_stock: 4 } }
  const facets = { counts, options: { seller: [{ value: 's-mwangaza', label: 'Mwangaza Wholesalers' }, { value: 's-rift', label: 'Rift Valley Traders' }] }, price: { min: '1180.00', max: '4850.00' } }
  return (
    <Plates cols={2}>
      <Plate label="sidebar · contract facets, counts, price slider" note="Written to the address below, as on the catalogue"><MemoryUrl><FacetFilterPanel meta={facetMeta} layout="sidebar" facets={facets} /></MemoryUrl></Plate>
      <Plate label="mobile sheet"><MemoryUrl><FacetFilterPanel meta={facetMeta} layout="sheet" facets={facets} /></MemoryUrl></Plate>
    </Plates>
  )
}

const line = (id: string, product: string, sku: string, image: CartLine['image'], quantity: number, unit: string, unitPrice: string, stock: CartLine['stock'], extra: Partial<CartLine> = {}): CartLine =>
  ({ id, product, sku, image, quantity, unit, unitPrice, stock, state: 'valid', moq: 5, step: 5, ...extra })

export const mwangazaGroup: SellerGroup = {
  sellerId: 'mwg', seller: sellers.mwangaza.label, location: 'Nakuru', dispatch: 'tomorrow 08:00', deliveryFee: '850.00', minimumOrder: '10000.00',
  lines: [line('l1', 'Mavuno Maize Flour 2 kg', 'MVN-2K-12', images.maize, 20, 'bale', '1690.00', stockFor['p-mvn-2k']!), line('l2', 'Mwea Pishori Rice 25 kg', 'MWP-25K-01', images.rice, 4, 'sack', '4850.00', stockFor['p-mwp-25']!, { moq: 2, step: 1 })],
}
export const riftGroup = (state: CartState): SellerGroup => ({
  sellerId: 'rvt', seller: sellers.rift.label, location: 'Eldoret', dispatch: 'Wednesday', deliveryFee: '1200.00',
  lines: [
    line('l3', 'Sukari Bora Sugar 1 kg', 'SKB-1K-24', images.sugar, 6, 'bale', state === 'repricing' ? '4087.00' : '3960.00', stockFor['p-skb-1k']!, state === 'repricing' ? { state: 'changed', previousUnitPrice: '3960.00', moq: 2, step: 1 } : { moq: 2, step: 1 }),
    line('l4', 'Unga Bora Baking Flour 2 kg', 'UBF-2K-10', images.flour, 10, 'bale', '1690.00', stockFor['p-ubf-2k']!),
  ],
})
export const pwaniGroup: SellerGroup = { sellerId: 'pwd', seller: sellers.pwani.label, location: 'Mombasa', dispatch: 'Friday', deliveryFee: '2400.00', lines: [line('l5', 'Jua Gold Cooking Oil 3 L', 'JUA-3L-06', images.oil, 3, 'carton', '5220.00', stockFor['p-jua-3l']!, { state: 'unavailable', moq: 1, step: 1, reason: 'Out of stock until Thu 15 Oct.' })] }

function Cart() {
  const [state, setState] = useState<CartState>('repricing')
  const groups = state === 'out-of-stock' ? [mwangazaGroup, riftGroup(state), pwaniGroup] : [mwangazaGroup, riftGroup(state)]
  return (
    <Plates cols={1}>
      <Plate label="state">
        <div className="mb-4"><Segmented label="Cart state" size="sm" value={state} onValueChange={setState} items={(['valid', 'repricing', 'out-of-stock', 'approval-needed'] as const).map(v => ({ value: v, label: v }))} /></div>
        <CartBlock groups={groups} state={state} approvalThreshold="250000.00" />
      </Plate>
    </Plates>
  )
}

function CartGroup() {
  return <Plates cols={1}><Plate label="expanded · minimum order not met"><SellerCartGroup group={{ ...riftGroup('valid'), minimumOrder: '60000.00' }} /></Plate><Plate label="collapsed · repriced and unavailable lines"><SellerCartGroup group={{ ...pwaniGroup, lines: [...pwaniGroup.lines, line('l6', 'Safi Laundry Bar 800 g', 'SFI-800-25', images.soap, 4, 'carton', '4375.00', stockFor['p-sfi-800']!, { state: 'changed', previousUnitPrice: '4250.00', moq: 2, step: 1 })] }} defaultOpen={false} /></Plate></Plates>
}

export const quoteLines = [{ id: 'q1', product: 'Mavuno Maize Flour 2 kg', quantity: 60, unit: 'bale', listPrice: '1690.00', offeredPrice: '1650.00' }, { id: 'q2', product: 'Mwea Pishori Rice 25 kg', quantity: 10, unit: 'sack', listPrice: '4850.00' }]
const quoteRequestFields = ['delivery_address', 'expires_at', 'buyer_notes']
export const addresses = [{ value: 'a1', label: 'Shop · Moi Avenue, Naivasha', description: 'Nakuru County' }, { value: 'a2', label: 'Store room · Kabati, Naivasha', description: 'Nakuru County' }]

function QuoteSheet() {
  const [status, setStatus] = useState<QuoteStatus>('draft')
  return (
    <Plates cols={1}>
      <Plate label="mode × status">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Status" size="sm" value={status} onValueChange={setStatus} items={(['draft', 'requested', 'responded', 'accepted', 'declined', 'expired'] as const).map(v => ({ value: v, label: v }))} />
          <QuoteRequestSheet mode={status === 'draft' ? 'create' : status === 'responded' ? 'revise' : 'view'} status={status} seller={sellers.mwangaza.label} lines={quoteLines} reference="SM-QT-000318" expiresAt="2026-10-21T17:00:00+03:00"
            fields={QuoteMeta.fields.filter(f => quoteRequestFields.includes(f.name))} options={{ delivery_address: addresses }}
            initial={{ delivery_address: { id: addresses[0]!.value, label: addresses[0]!.label }, expires_at: '2026-10-21T17:00:00+03:00' }}
            trigger={<Button variant="primary">Open quote sheet</Button>} />
        </div>
      </Plate>
    </Plates>
  )
}

function QuoteDecision() {
  return <Plates cols={2}><Plate label="respond · counter"><QuoteDecisionPanel reference="SM-QT-000318" buyer={buyers.wanjiru.label} lines={quoteLines} expiresAt="2026-10-16T17:00:00+03:00" /></Plate><Plate label="accepted snapshot (immutable)"><QuoteDecisionPanel reference="SM-QT-000301" buyer={buyers.baraka.label} lines={quoteLines} expiresAt="2026-10-10T17:00:00+03:00" accepted={{ at: '2026-10-09T15:20:00+03:00', total: '147500.00' }} /></Plate></Plates>
}

export const approvalSteps = [{ level: 1, role: 'Buyer owner', approver: people.grace, decision: 'approved' as const, decidedAt: '2026-10-12T10:51:00+03:00', comment: 'Fine for this week’s restock.' }, { level: 2, role: 'Finance', approver: people.joseph }]

function Approvals() {
  return (
    <Plates cols={2}>
      <Plate label="pending · can decide"><ApprovalFlowBlock state="pending" policyName="Restock policy" threshold="250000.00" orderTotal="312400.00" steps={approvalSteps} canDecide /></Plate>
      <Plate label="pending · purchaser view"><ApprovalFlowBlock state="pending" policyName="Restock policy" threshold="250000.00" orderTotal="312400.00" steps={approvalSteps} /></Plate>
      <Plate label="rejected"><ApprovalFlowBlock state="rejected" policyName="Restock policy" threshold="250000.00" orderTotal="312400.00" steps={[approvalSteps[0]!, { level: 2, role: 'Finance', approver: people.joseph, decision: 'rejected', decidedAt: '2026-10-12T11:30:00+03:00', comment: 'Credit limit reached; split into two orders.' }]} /></Plate>
      <Plate label="not-required"><ApprovalFlowBlock state="not-required" policyName="Restock policy" threshold="250000.00" orderTotal="48250.00" steps={[]} /></Plate>
      <Plate label="not-required · placed by an approver"><ApprovalFlowBlock state="not-required" policyName="Restock policy" threshold="250000.00" orderTotal="312400.00" steps={[]} note="Placed by a buyer owner: under this policy their own orders go straight to the seller." /></Plate>
    </Plates>
  )
}

const res = (status: Reservation['status']): Reservation => ({ id: 'RSV-88213', quantity: 24, unit: 'bale', status, expiresAt: '2026-10-12T11:52:00+03:00', product: 'Mavuno Maize Flour 2 kg', orderReference: 'SM-ORD-004215' })

function Reservations() {
  const states: Reservation['status'][] = ['active', 'expiring', 'expired', 'consumed', 'released']
  return (
    <Plates cols={2}>
      <Plate label="compact"><div className="flex flex-col items-start gap-2">{states.map(s => <ReservationIndicator key={s} reservation={res(s)} />)}</div></Plate>
      <Plate label="full"><div className="flex flex-col gap-3">{states.map(s => <ReservationIndicator key={s} reservation={res(s)} variant="full" />)}</div></Plate>
    </Plates>
  )
}

function Countdown() {
  const [anchor] = useState(() => Date.now())
  const at = (s: number) => new Date(anchor + s * 1000).toISOString()
  return (
    <Plates cols={3}>
      <Plate label="running · 11 min left"><ReservationCountdown expiresAt={at(660)} totalSeconds={900} /></Plate>
      <Plate label="expiring · under 2 min"><ReservationCountdown expiresAt={at(95)} totalSeconds={900} /></Plate>
      <Plate label="paused while payment settles"><ReservationCountdown expiresAt={at(420)} totalSeconds={900} pausedAt={new Date(anchor).toISOString()} /></Plate>
      <Plate label="expired"><ReservationCountdown expiresAt={at(-30)} totalSeconds={900} /></Plate>
    </Plates>
  )
}

export const checkoutGroups = [{ seller: sellers.mwangaza.label, lines: 2, subtotal: '53200.00', deliveryFee: '850.00', dispatch: 'tomorrow 08:00' }, { seller: sellers.rift.label, lines: 2, subtotal: '40660.00', deliveryFee: '1200.00', dispatch: 'Wednesday' }]
export const naivasha = { label: 'Shop', line1: 'Moi Avenue, opposite the bus stage', city: 'Naivasha', region: 'Nakuru', postalCode: '20117', countryCode: 'KE', validated: true }

function Checkout() {
  const [step, setStep] = useState<'address' | 'review' | 'payment' | 'result'>('review')
  const [state, setState] = useState<'valid' | 'blocked' | 'submitting'>('valid')
  const [addr, setAddr] = useState<unknown>(naivasha)
  const [holdUntil] = useState(() => new Date(Date.now() + 660_000).toISOString())
  return (
    <Plates cols={1}>
      <Plate label="step × state">
        <div className="mb-4 flex flex-wrap gap-3">
          <Segmented label="Step" size="sm" value={step} onValueChange={setStep} items={(['address', 'review', 'payment', 'result'] as const).map(v => ({ value: v, label: v }))} />
          <Segmented label="State" size="sm" value={state} onValueChange={setState} items={(['valid', 'blocked', 'submitting'] as const).map(v => ({ value: v, label: v }))} />
        </div>
        <CheckoutSummaryBlock step={step} state={state} groups={checkoutGroups} address={naivasha} blockedReason="Your stock hold expired. Check availability and reserve again to continue.">
          {step === 'address' ? <FieldInput field={{ name: 'delivery_address', type: 'address', widget: 'address', label: 'Delivery address', required: true }} value={addr} onChange={setAddr} /> : null}
          {step === 'review' ? <ReservationCountdown expiresAt={holdUntil} totalSeconds={900} /> : null}
          {step === 'payment' ? <PaymentStatusPanel state="created" amount="95910.00" orderReference="SM-ORD-004215" phone="+254712345678" /> : null}
          {step === 'result' ? <PaymentStatusPanel state="confirmed" amount="95910.00" orderReference="SM-ORD-004215" phone="+254712345678" transactionId="TXN-1770727500-12345" sentAt="2026-10-12T11:30:00+03:00" /> : null}
        </CheckoutSummaryBlock>
      </Plate>
    </Plates>
  )
}

function CheckoutWithoutPayment() {
  const [step, setStep] = useState<'address' | 'review' | 'result'>('review')
  return (
    <Plates cols={1}>
      <Plate label="no payment step · fees confirmed by each seller">
        <div className="mb-4"><Segmented label="Step" size="sm" value={step} onValueChange={setStep} items={(['address', 'review', 'result'] as const).map(v => ({ value: v, label: v }))} /></div>
        <CheckoutSummaryBlock step={step} steps={['address', 'review', 'result']} state="valid" groups={checkoutGroups.map(({ seller, lines, subtotal }) => ({ seller, lines, subtotal }))} address={naivasha}
          continueLabel={step === 'address' ? 'Review the orders' : 'Place 2 orders'} onContinue={() => setStep(step === 'address' ? 'review' : 'result')} onBack={() => setStep('address')}>
          <p className="border border-border bg-surface p-4 text-md">{step === 'result' ? 'Two orders placed; one waits for approval.' : 'Each seller receives their own order.'}</p>
        </CheckoutSummaryBlock>
      </Plate>
    </Plates>
  )
}

function CheckoutFlows() {
  return <div className="flex flex-col gap-6"><CheckoutWithoutPayment /><Checkout /></div>
}

function Payment() {
  const [state, setState] = useState<PaymentState>('pending')
  const common = { amount: '48250.00', orderReference: 'SM-ORD-004215', phone: '+254712345678', transactionId: state === 'created' ? undefined : 'TXN-1770727500-12345', sentAt: '2026-10-12T11:30:00+03:00' }
  return (
    <Plates cols={2}>
      <Plate label="SellaPay STK push · every state" span>
        <div className="mb-4"><Segmented label="Payment state" size="sm" value={state} onValueChange={setState} items={(['created', 'pending', 'stale', 'failed', 'cancelled', 'confirmed', 'reconciled', 'refunded'] as const).map(v => ({ value: v, label: v }))} /></div>
        <div className="max-w-xl"><PaymentStatusPanel state={state} {...common} staleMinutes={9} failure="The M-Pesa PIN request timed out on the phone." retryable confirmations={state === 'reconciled' ? 2 : 1} /></div>
      </Plate>
    </Plates>
  )
}

export const orderTransitions = [
  { id: 't0', to: 'pending_approval' as const, at: '2026-10-11T15:31:00+03:00', actor: people.brian, reason: 'Placed from the cart' },
  { id: 't1', from: 'pending_approval' as const, to: 'submitted' as const, at: '2026-10-11T15:44:00+03:00', actor: people.grace, reason: 'Approved by Grace Wanjiru' },
  { id: 't2', from: 'submitted' as const, to: 'confirmed' as const, at: '2026-10-11T16:05:00+03:00', actor: people.faith },
  { id: 't3', from: 'confirmed' as const, to: 'picking' as const, at: '2026-10-12T07:10:00+03:00', actor: people.peter },
  { id: 't4', from: 'picking' as const, to: 'partially_fulfilled' as const, at: '2026-10-12T08:20:00+03:00', actor: people.peter, reason: 'Sugar short by 3 bales; buyer accepted the partial delivery.', reference: 'FUL-7781' },
]

function OrderTimeline() {
  return <Plates cols={2}><Plate label="full"><OrderTimelineBlock transitions={orderTransitions} now={DEMO_NOW} next={['Ship the remaining lines', 'Close as fulfilled', 'Open a dispute']} /></Plate><Plate label="compact"><OrderTimelineBlock transitions={orderTransitions} variant="compact" now={DEMO_NOW} /></Plate></Plates>
}

export const deliveryEvents = [{ id: 's1', at: '2026-10-12T08:30:00+03:00', label: 'Handed to carrier', location: 'Nakuru depot' }, { id: 's2', at: '2026-10-12T09:45:00+03:00', label: 'Departed', location: 'Gilgil' }]

function Delivery() {
  return (
    <Plates cols={2}>
      <Plate label="in transit"><DeliveryTrackingBlock status="in_transit" carrier="Rift Express" reference="RX-552019" windowStart="2026-10-12T12:00:00+03:00" windowEnd="2026-10-12T14:00:00+03:00" events={deliveryEvents} mapHref="#" now={DEMO_NOW} /></Plate>
      <Plate label="delayed (window passed)"><DeliveryTrackingBlock status="in_transit" carrier="Rift Express" reference="RX-551870" windowStart="2026-10-12T08:00:00+03:00" windowEnd="2026-10-12T10:00:00+03:00" events={deliveryEvents.slice(0, 1)} delayed lastEventAt="2026-10-12T08:30:00+03:00" now={DEMO_NOW} /></Plate>
      <Plate label="delivered · proof"><DeliveryTrackingBlock status="delivered" carrier="Own fleet · KDA 412X" reference="SHP-20441" windowStart="2026-10-11T09:00:00+03:00" windowEnd="2026-10-11T11:00:00+03:00" events={[...deliveryEvents, { id: 's3', at: '2026-10-11T10:40:00+03:00', label: 'Delivered, signed by M. Wanjiru', location: 'Naivasha' }]} proofOfDelivery={{ name: 'pod-SHP-20441.jpg', size: 1_240_000, type: 'image/jpeg', state: 'ready', url: '#' }} /></Plate>
      <Plate label="stale (no news) · seller actions"><DeliveryTrackingBlock status="in_transit" carrier="G4S Logistics" reference="G4S-77812" windowEnd="2026-10-14T17:00:00+03:00" events={deliveryEvents} stale lastEventAt="2026-10-12T09:45:00+03:00" now={DEMO_NOW} actions={<Button size="sm" variant="secondary">Add update</Button>} /></Plate>
      <Plate label="no window yet"><DeliveryTrackingBlock status="pending" carrier="Own van" reference="" events={[]} /></Plate>
      <Plate label="unknown (no carrier events)"><DeliveryTrackingBlock status="handed_over" carrier="Coast Haulage" reference="CH-90021" windowStart="2026-10-14T09:00:00+03:00" windowEnd="2026-10-14T17:00:00+03:00" events={[]} /></Plate>
    </Plates>
  )
}

export const returnEvidence = [{ name: 'torn-bales-1.jpg', size: 1_900_000, type: 'image/jpeg', state: 'ready' as const, url: '#' }, { name: 'delivery-note-55102.pdf', size: 220_000, type: 'application/pdf', state: 'scanning' as const }]

export const returnClaim = 'Three of twelve bales arrived torn at the seams and wet. We set them aside unopened; photos attached.'
/** A case the seller may act on, so the action bar shows the contract's commands and their dialogs. */
export const sellerCase = { id: 'case-42', reference: 'RET-0042', status: 'reviewing', _can: ['request_evidence', 'add_evidence', 'decide'] }
export const caseEvidence = [
  { ...returnEvidence[0]!, note: 'Bales as they came off the lorry', side: 'buyer' as const, addedAt: '2026-10-12T09:16:00+03:00' },
  { ...returnEvidence[1]!, note: 'Signed delivery note', side: 'buyer' as const, addedAt: '2026-10-12T09:18:00+03:00' },
]

function Returns() {
  return (
    <Plates cols={2}>
      <Plate label="reviewing · seller decides" span><ReturnDisputeCaseBlock reference="RET-0042" type="damage" status="reviewing" line="Mavuno Maize Flour 2 kg × 3 of 20" reason={returnClaim} evidence={caseEvidence} openedAt="2026-10-12T09:15:00+03:00" now={DEMO_NOW}
        parties={{ buyer: 'Wanjiru General Stores', seller: 'Mavuno Mills' }} windowCloses="2026-10-26T09:15:00+03:00" actions={<ActionBar meta={ReturnCaseMeta} record={sellerCase} onRun={() => undefined} />} /></Plate>
      <Plate label="evidence requested"><ReturnDisputeCaseBlock reference="DSP-0011" type="shortage" status="evidence_requested" line="Sukari Bora Sugar 1 kg × 2 of 6" reason="Two bales missing from the delivery." evidence={[]} openedAt="2026-10-11T17:00:00+03:00" now={DEMO_NOW} evidenceNote="a photo of the signed delivery note" /></Plate>
      <Plate label="resolved"><ReturnDisputeCaseBlock reference="RET-0038" type="wrong_item" status="resolved" line="Safi Laundry Bar 800 g × 1" reason="Received 400 g bars instead of 800 g." evidence={caseEvidence.slice(0, 1)} openedAt="2026-10-08T12:00:00+03:00" now={DEMO_NOW}
        decision={{ label: 'Approve part of the claim', approvedQuantity: 1, unit: 'carton', notes: 'One carton was the wrong size; we refund it and collect it with the next delivery.', disposition: 'Restock', refund: '1450.00', refunded: '1450.00', decidedAt: '2026-10-09T10:00:00+03:00' }} /></Plate>
    </Plates>
  )
}

export const reorderLines: ReorderLine[] = [
  { id: 'r1', product: 'Mavuno Maize Flour 2 kg', unit: 'bale', thenQuantity: 20, thenPrice: '1690.00', nowQuantity: 20, nowPrice: '1690.00', kinds: [], addable: true },
  { id: 'r2', product: 'Sukari Bora Sugar 1 kg', unit: 'bale', thenQuantity: 6, thenPrice: '3960.00', nowQuantity: 6, nowPrice: '4087.00', kinds: ['price'], addable: true },
  { id: 'r3', product: 'Unga Bora Baking Flour 2 kg', unit: 'bale', thenQuantity: 4, thenPrice: '1650.00', nowQuantity: 5, nowPrice: '1690.00', kinds: ['price', 'moq'], addable: true },
  { id: 'r4', product: 'Maziwa Milk Powder 400 g', unit: 'tray', thenQuantity: 10, thenPrice: '7080.00', nowQuantity: 4, nowPrice: '7080.00', stock: stockFor['p-mzw-400'], kinds: ['stock'], addable: true },
  { id: 'r5', product: 'Jua Gold Cooking Oil 5 L', unit: 'carton', thenQuantity: 2, thenPrice: '6900.00', kinds: ['discontinued'], addable: false },
]

function Reorder() {
  return <Plates cols={1}><Plate label="price, minimum order, stock and discontinued differences"><ReorderDiffBlock orderReference="SO-2026-0141" placedOn="2026-09-14T08:15:00+03:00" lines={reorderLines} replacesCartLines={3} onAdd={() => undefined} /></Plate></Plates>
}

const day = (i: number, from: number) => new Date(Date.UTC(2026, 9, 12 - from + i)).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })
const series = (n: number, seed: number) => Array.from({ length: n }, (_, i) => { const weekday = (i + seed) % 7; const v = weekday === 6 ? 0 : 160 + ((i * 37 + seed * 11) % 140) + (weekday === 4 ? 60 : 0); return v * 1000 })
export const period = (n: number, revenue: string): AnalyticsPeriod => ({
  metrics: [{ ...sellerMetrics[0]!, value: revenue }, ...sellerMetrics.slice(1)],
  daily: series(n, 3).map((v, i) => ({ key: String(i), label: day(i, n), value: v, display: formatMoney(String(v)) })),
  topProducts: [{ rank: 1, product: 'Mavuno Maize Flour 2 kg', units: '1,284 bales', revenue: '2169960.00' }, { rank: 2, product: 'Mwea Pishori Rice 25 kg', units: '312 sacks', revenue: '1513200.00' }, { rank: 3, product: 'Unga Bora Baking Flour 2 kg', units: '640 bales', revenue: '1081600.00' }, { rank: 4, product: 'Safi Laundry Bar 800 g', units: '188 cartons', revenue: '822500.00' }],
})

function Analytics() {
  return <Plates cols={1}><Plate label="range presets · shared metric definitions"><SellerAnalyticsGrid periods={{ '7d': period(7, 'KES 1.62M'), '30d': period(30, 'KES 6.94M'), '90d': period(90, 'KES 19.8M') }} definitionVersion="seller.metrics@2" /></Plate></Plates>
}

export const apiTokens: ApiToken[] = [{ id: 't1', name: 'Stock sync (ERP)', scopes: ['catalogue.read', 'order.read'], last4: '8d2c', createdAt: '2026-08-02T10:00:00+03:00', lastUsedAt: '2026-10-12T11:35:00+03:00', status: 'active' }, { id: 't2', name: 'Old reporting script', scopes: ['order.read'], last4: '11af', createdAt: '2026-03-14T10:00:00+03:00', status: 'revoked' }]
export const webhookEndpoints: WebhookEndpoint[] = [{ id: 'w1', url: 'https://hooks.mwangaza-demo.co.ke/sokomesh/orders', events: ['order.submitted', 'order.shipped'], active: true, lastDelivery: { status: 'delivered', at: '2026-10-12T11:18:04+03:00', attempts: 1, code: 200 } }, { id: 'w2', url: 'https://erp.mwangaza-demo.co.ke/stock', events: ['inventory.reserved'], active: true, lastDelivery: { status: 'retrying', at: '2026-10-12T11:22:30+03:00', attempts: 3, code: 503 } }]

const noop = () => undefined
const tokenRecord = (t: ApiToken) => ({ id: t.id, name: t.name, status: t.status, _can: t.status === 'active' ? ['revoke'] : [] })
const hookRecord = (w: WebhookEndpoint) => ({ id: w.id, url: w.url, is_active: w.active, _can: ['rotate_secret', w.active ? 'switch_off' : 'switch_on'] })

function Integrations() {
  return (
    <Plates cols={1}>
      <Plate label="tokens and webhooks · each row with the contract's commands">
        <IntegrationPanel now={DEMO_NOW} tokens={apiTokens} webhooks={webhookEndpoints}
          addToken={<Button variant="primary">Issue a token</Button>} addWebhook={<Button variant="primary">Add a webhook</Button>}
          tokenActions={t => <ActionBar meta={ApiTokenMeta} record={tokenRecord(t)} onRun={noop} density="compact" />}
          webhookActions={w => <ActionBar meta={WebhookEndpointMeta} record={hookRecord(w)} onRun={noop} density="compact" />} />
      </Plate>
      <Plate label="empty"><IntegrationPanel tokens={[]} webhooks={[]} /></Plate>
    </Plates>
  )
}

function Secret() {
  return (
    <Plates cols={2}>
      <Plate label="a new token"><SecretReveal title="Token “Stock sync (ERP)”" value="smk_4f9a2c1e_Qm9vb2s4dGVzdC1vbmx5LW5vdC1yZWFsLXNlY3JldA" detail="Copy it into the system that will use it. SokoMesh keeps only a fingerprint and cannot show it again." onDone={noop} /></Plate>
      <Plate label="a replaced signing secret"><SecretReveal title="Signing secret" value="whsec_specimen_value_not_a_real_secret_0000" detail="Deliveries to https://erp.mwangaza-demo.co.ke/stock are signed with this secret from now on." onDone={noop} /></Plate>
    </Plates>
  )
}

export const reconciliationChecks: ReconciliationCheck[] = [
  { key: 'unpaid_orders', label: 'Orders with sellers but no confirmed payment', help: 'Every order a seller sees should have been paid.', count: 0, ok: true, examples: [], traceable: true },
  { key: 'ledger_drift', label: 'Stock balances that differ from their movements', help: 'On hand must equal the sum of its movements; a difference means a change bypassed the ledger.', count: 0, ok: true, examples: [] },
  { key: 'lagging_holds', label: 'Stock holds past their time and not yet released', help: 'The expiry worker (expire_reservations) is behind or stopped.', count: 2, ok: false, examples: ['RSV-000184', 'RSV-000191'], traceable: true },
  { key: 'failed_webhooks', label: 'Webhook deliveries that gave up', help: 'An organization’s endpoint refused every attempt; they can send it again.', count: 1, ok: false, examples: ['order.shipped to https://erp.mwangaza-demo.co.ke/stock'] },
]

function Checks() {
  return (
    <Plates cols={1}>
      <Plate label="needs a look · traceable examples"><ReconciliationChecksBlock checks={reconciliationChecks} onTrace={noop} checkedAt="2026-10-12T11:40:00+03:00" now={DEMO_NOW} /></Plate>
      <Plate label="all clear"><ReconciliationChecksBlock checks={reconciliationChecks.map(c => ({ ...c, ok: true, count: 0, examples: [] }))} /></Plate>
    </Plates>
  )
}

const heldFor = (anchor: number, status: ReservationRecord['status'] = 'active'): ReservationRecord[] => [
  { id: 'h1', reference: 'RSV-000201', product: 'Mavuno Maize Flour', sku: 'MVN-2K-12', quantity: 24, unit: 'bale', status, expires_at: new Date(anchor + 660_000).toISOString() },
  { id: 'h2', reference: 'RSV-000202', product: 'Sukari Bora Sugar', sku: 'SKB-1K-24', quantity: 6, unit: 'bale', status, expires_at: new Date(anchor + 660_000).toISOString() },
]
const attempt = (status: PaymentRecord['status'], extra: Partial<PaymentRecord> = {}): PaymentRecord => ({
  id: 'pay-1', status, amount: '48250.00', currency: 'KES', provider: 'sandbox', reference: status === 'created' ? null : 'SBX-7F3A91C2', phone: '0712 *** 678', attempt: 1,
  sent_at: '2026-10-12T11:30:00+03:00', confirmed_at: status === 'confirmed' ? '2026-10-12T11:31:10+03:00' : null, failure: null, refunded_amount: '0.00',
  results_received: status === 'pending' ? 0 : 2, duplicates: status === 'pending' ? 0 : 1, sandbox: status === 'pending', confirms: true, ...extra,
})

/** The block against a pretend provider: the sandbox phone's answers come back as the API would report them. */
export function PaymentFlow() {
  const [anchor] = useState(() => Date.now())
  const [payment, setPayment] = useState<PaymentRecord | undefined>()
  const [answering, setAnswering] = useState<SandboxOutcome | null>(null)
  const outcome: Record<SandboxOutcome, Partial<PaymentRecord> & { status: PaymentRecord['status'] }> = {
    approve: { status: 'confirmed' }, cancel: { status: 'cancelled' }, wrong_pin: { status: 'failed', failure: 'Wrong M-Pesa PIN entered.' },
    insufficient_funds: { status: 'failed', failure: 'Not enough money in the M-Pesa account.' }, timeout: { status: 'failed', failure: 'The prompt timed out on the phone.' },
  }
  const answer = (_id: string, o: SandboxOutcome) => {
    setAnswering(o)
    setTimeout(() => { const { status, ...rest } = outcome[o]; setPayment(attempt(status, { ...rest, sandbox: false })); setAnswering(null) }, 600)
  }
  const done = payment?.status === 'confirmed'
  return (
    <OrderPaymentBlock orderReference="SM-ORD-004215" amount="48250.00" holds={heldFor(anchor, done ? 'consumed' : 'active')} holdSeconds={900} payment={payment}
      canPay={!done} answering={answering} onPay={() => setPayment(attempt('pending'))} onAnswer={answer} onCheckAgain={noop} />
  )
}

function OrderPaymentSpecimen() {
  const [anchor] = useState(() => Date.now())
  return (
    <Plates cols={1}>
      <Plate label="interactive · send the prompt, answer it on the sandbox phone"><PaymentFlow /></Plate>
      <Plate label="paid · one repeated result ignored"><OrderPaymentBlock orderReference="SM-ORD-004215" amount="48250.00" holds={heldFor(anchor, 'consumed')} holdSeconds={900} payment={attempt('confirmed')} canPay={false} onPay={noop} /></Plate>
      <Plate label="refunded after a cancellation"><OrderPaymentBlock orderReference="SM-ORD-004188" amount="12400.00" holds={heldFor(anchor, 'cancelled')} holdSeconds={900} payment={attempt('refunded', { refunded_amount: '12400.00', failure: 'the order was cancelled' })} canPay={false} onPay={noop} /></Plate>
      <Plate label="not stock-tracked · ready to pay"><OrderPaymentBlock orderReference="SM-ORD-004230" amount="9800.00" holds={[]} holdSeconds={900} canPay onPay={noop} /></Plate>
    </Plates>
  )
}

export const traceEvents: TraceEvent[] = [
  { id: 'x1', at: '2026-10-12T11:18:00+03:00', domain: 'order', event: 'order.awaiting_payment', summary: 'SM-ORD-004215 placed, KES 48,250.00, waiting for payment', requestId: 'req_7f3a10', eventId: 'evt_9182', actor: people.brian },
  { id: 'x2', at: '2026-10-12T11:18:01+03:00', domain: 'inventory', event: 'inventory.reserved', summary: '24 bales MVN-2K-12 held until 11:33 (RSV-000201)', requestId: 'req_7f3a10', eventId: 'evt_9183', actor: people.brian },
  { id: 'x3', at: '2026-10-12T11:30:00+03:00', domain: 'payment', event: 'payment.prompt_sent', summary: 'M-Pesa prompt SBX-7F3A91C2 for KES 48,250.00 to 0712 *** 678', requestId: 'req_7f3b44', eventId: 'evt_9240', actor: people.brian },
  { id: 'x4', at: '2026-10-12T11:31:10+03:00', domain: 'payment', event: 'payment.confirmed', summary: 'SBX-7F3A91C2 confirmed; a repeated result was ignored', requestId: 'req_7f3b61', eventId: 'evt_9241', actor: 'Payment sandbox' },
  { id: 'x5', at: '2026-10-12T11:31:10+03:00', domain: 'order', event: 'order.submitted', summary: 'SM-ORD-004215 sent to Mavuno Mills', requestId: 'req_7f3b61', eventId: 'evt_9242', actor: 'Payment sandbox' },
  { id: 'x6', at: '2026-10-12T14:02:00+03:00', domain: 'fulfilment', event: 'fulfilment.handed_over', summary: '23 of 24 bales handed to Rift Express (RX-552019)', reason: 'One bale torn at the seam; set aside for the supplier.', requestId: 'req_80a1c2', eventId: 'evt_9310', actor: people.peter },
  { id: 'x7', at: '2026-10-12T14:02:01+03:00', domain: 'payment', event: 'payment.refunded', summary: 'KES 1,690.00 refunded for the bale not shipped', requestId: 'req_80a1c2', eventId: 'evt_9311', actor: people.peter },
  { id: 'x8', at: '2026-10-13T09:15:00+03:00', domain: 'return', event: 'return.opened', summary: 'RET-0042: 3 bales damaged on the way', requestId: 'req_81f004', eventId: 'evt_9402', actor: people.brian },
  { id: 'x9', at: '2026-10-13T10:00:00+03:00', domain: 'inventory', event: 'inventory.expired_run', summary: 'Hold sweep released 2 lapsed holds', requestId: '', eventId: 'evt_9410', actor: '' },
]

function Trace() {
  return <Plates cols={1}><Plate label="filter by domain · expand an event"><ReconciliationTraceBlock correlationId="ord_7c1e0b9a4f" query="SM-ORD-004215" events={traceEvents} now={DEMO_NOW} /></Plate></Plates>
}

export const notifications: AppNotification[] = [
  { id: 'n1', channel: 'in_app', title: 'Approval needed: SM-ORD-004219', body: 'Brian Otieno submitted an order for KES 312,400.00, above the KES 250,000.00 restock limit.', deepLink: '#order', status: 'sent', sentAt: '2026-10-12T11:36:00+03:00' },
  { id: 'n2', channel: 'in_app', title: 'Payment awaiting confirmation', body: 'M-Pesa prompt sent to +254 ••• ••• 678 for KES 48,250.00. Do not pay again.', deepLink: '#payment', status: 'sent', sentAt: '2026-10-12T11:30:00+03:00' },
  { id: 'n3', channel: 'in_app', title: 'Quote SM-QT-000318 has a reply', body: 'Mwangaza Wholesalers offered KES 1,690.00 per bale for 60 bales a week.', deepLink: '#quote', status: 'sent', sentAt: '2026-10-12T10:02:00+03:00' },
  { id: 'n4', channel: 'email', title: 'Order SM-ORD-004198 delivered', body: '20 bales Mavuno Maize Flour 2 kg delivered to Shop, Naivasha. Signed by M. Wanjiru.', deepLink: '#order', status: 'failed', sentAt: '2026-10-11T10:41:00+03:00' },
  { id: 'n5', channel: 'in_app', title: 'Order SM-ORD-004198 delivered', body: '20 bales Mavuno Maize Flour 2 kg delivered to Shop, Naivasha. Signed by M. Wanjiru.', deepLink: '#order', status: 'read', sentAt: '2026-10-11T10:40:00+03:00', readAt: '2026-10-11T11:02:00+03:00' },
  { id: 'n6', channel: 'email', title: 'Daily order summary', body: '3 orders submitted, 1 awaiting approval.', status: 'queued' },
]
export const preferences: NotificationPreference[] = (['order', 'approval', 'quote', 'payment', 'delivery'] as const).flatMap(event =>
  (['in_app', 'email'] as const).map(channel => ({ event, channel, enabled: channel === 'in_app' || event === 'payment' || event === 'approval' })))

function Notifications() {
  const [list, setList] = useState(notifications)
  const markRead = (id: string) => setList(l => l.map(n => (n.id === id ? { ...n, status: 'read' as const, readAt: DEMO_NOW } : n)))
  const markAll = () => setList(l => l.map(n => (n.status === 'sent' && !n.readAt ? { ...n, status: 'read' as const, readAt: DEMO_NOW } : n)))
  return (
    <Plates cols={2}>
      <Plate label="page · unread, read, failed, queued" span><NotificationsBlock notifications={list} now={DEMO_NOW} onMarkRead={markRead} onMarkAllRead={markAll} /></Plate>
      <Plate label="panel"><div className="max-w-sm rounded-md border border-border bg-surface"><NotificationsBlock notifications={list.slice(0, 3)} layout="panel" now={DEMO_NOW} onMarkRead={markRead} /></div></Plate>
      <Plate label="loading"><NotificationsBlock notifications={[]} state="loading" /></Plate>
      <Plate label="empty"><NotificationsBlock notifications={[]} state="empty" /></Plate>
      <Plate label="error"><NotificationsBlock notifications={[]} state="error" onRetry={() => undefined} /></Plate>
    </Plates>
  )
}

function Bell() {
  const [list, setList] = useState(notifications)
  return (
    <Plates cols={3}>
      <Plate label="unread count"><NotificationBell notifications={list} now={DEMO_NOW} allHref="#notifications" onMarkRead={id => setList(l => l.map(n => (n.id === id ? { ...n, status: 'read' as const, readAt: DEMO_NOW } : n)))} onMarkAllRead={() => setList(l => l.map(n => ({ ...n, readAt: n.readAt ?? DEMO_NOW, status: n.status === 'sent' ? 'read' as const : n.status })))} /></Plate>
      <Plate label="over nine"><NotificationBell notifications={Array.from({ length: 12 }, (_, i) => ({ ...notifications[0]!, id: `b${i}` }))} now={DEMO_NOW} /></Plate>
      <Plate label="nothing unread"><NotificationBell notifications={notifications.filter(n => n.status !== 'sent')} now={DEMO_NOW} /></Plate>
    </Plates>
  )
}

function Preferences() {
  const [prefs, setPrefs] = useState(preferences)
  const [saving, setSaving] = useState<string | undefined>()
  const [locale, setLocale] = useState<string>(locales.default)
  const change = (p: NotificationPreference) => {
    setSaving(`${p.event}:${p.channel}`)
    setTimeout(() => { setPrefs(l => l.map(x => (x.event === p.event && x.channel === p.channel ? p : x))); setSaving(undefined) }, 700)
  }
  const changeLocale = (l: string) => {
    setSaving('locale')
    setTimeout(() => { setLocale(l); setSaving(undefined) }, 700)
  }
  return (
    <Plates cols={1}>
      <Plate label="language from the contract · event by channel · saving per change"><NotificationPreferencesBlock preferences={prefs} onChange={change} savingKey={saving} locale={locale} onLocaleChange={changeLocale} /></Plate>
      <Plate label="restricted"><NotificationPreferencesBlock preferences={prefs.slice(0, 4)} restricted="Your organization owner manages notifications for purchasers." locale="sw-KE" /></Plate>
    </Plates>
  )
}

function CategoryHeroSpecimen() {
  return (
    <Plates cols={1}>
      <Plate label="with photograph" tone="canvas"><CategoryHero title="Flour & grains" description="Maize flour, wheat flour and rice from approved Kenyan wholesalers." count={64} sellers={3} breadcrumbs={<Breadcrumbs items={[{ label: 'Catalogue', href: '#' }, { label: 'Flour & grains' }]} />} scene={scenes['category-grains']} /></Plate>
      <Plate label="text only" tone="canvas"><CategoryHero title="Dairy" description="Milk powder and long-life milk." count={9} /></Plate>
    </Plates>
  )
}

function GallerySpecimen() {
  const cut = (i: typeof images.maize) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height, fit: 'contain' as const })
  const scene = (k: keyof typeof scenes, credit: string) => ({ url: scenes[k].src, alt: scenes[k].alt, width: scenes[k].width, height: scenes[k].height, fit: 'cover' as const, credit })
  return (
    <Plates cols={2}>
      <Plate label="one photograph"><ProductGallery name="Mavuno Maize Flour 2 kg" images={[cut(images.maize)]} /></Plate>
      <Plate label="four photographs, rail beside or below by width"><ProductGallery name="Mwea Pishori Rice 25 kg" images={[cut(images.rice), scene('category-grains', 'Photo: Unsplash'), scene('story-stock', 'Photo: Unsplash'), scene('story-delivery', 'Photo: Unsplash')]} /></Plate>
    </Plates>
  )
}

const map: Record<string, () => ReactNode> = {
  'X-34': OrderPaymentSpecimen, 'X-35': Secret, 'X-36': Checks,
  'X-01': Onboarding, 'X-02': ProductEditor, 'X-03': Variants, 'X-04': Media, 'X-05': PriceBook, 'X-06': Tiers, 'X-07': Ledger, 'X-08': Stock,
  'X-09': Facets, 'X-10': Cart, 'X-11': CartGroup, 'X-12': QuoteSheet, 'X-13': QuoteDecision, 'X-14': Approvals, 'X-15': Reservations,
  'X-16': Countdown, 'X-17': CheckoutFlows, 'X-18': Payment, 'X-19': OrderTimeline, 'X-20': Delivery, 'X-21': Returns, 'X-22': Reorder,
  'X-23': Analytics, 'X-24': Integrations, 'X-25': Trace, 'X-26': Notifications, 'X-27': Bell, 'X-28': Preferences, 'X-29': CategoryHeroSpecimen, 'X-30': GallerySpecimen,
  'X-31': Buy, 'X-32': Compare, 'X-33': Details,
}

export default function CommerceSpecimens({ code }: { code: string }) {
  const S = map[code]
  return S ? <S /> : null
}
