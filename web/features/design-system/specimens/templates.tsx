'use client'

import { ArrowRight, Bell, Building2, LayoutDashboard, Package, ReceiptText, ScrollText, Settings, ShieldCheck, ShoppingCart, Store, Users, Webhook } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { IntegrationPanel, ReconciliationTraceBlock, SellerAnalyticsGrid } from '@/components/commerce/admin'
import { ApprovalFlowBlock, CartBlock, QuoteDecisionPanel } from '@/components/commerce/cart'
import { FacetFilterPanel, MediaManager, ProductEditorBlock, SellerOnboardingReviewBlock, VariantMatrixEditor } from '@/components/commerce/catalog'
import { CheckoutSummaryBlock, PaymentStatusPanel } from '@/components/commerce/checkout'
import { NotificationBell, NotificationPreferencesBlock, NotificationsBlock } from '@/components/commerce/notifications'
import { DeliveryTrackingBlock, OrderTimelineBlock, ReturnDisputeCaseBlock } from '@/components/commerce/orders'
import { PriceBookEditor, PriceTierTable, ReorderDiffBlock } from '@/components/commerce/pricing'
import { InventoryLedgerBlock, ReservationCountdown, ReservationIndicator, StockAvailabilityIndicator } from '@/components/commerce/stock'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { ChatBlock } from '@/components/kernel/blocks/ChatBlock'
import { ActivityBlock, DetailBlock, RelatedBlock, StatsBlock, type ActivityEvent, type Metric } from '@/components/kernel/blocks/DataBlocks'
import { FiltersBlock, type FilterValues } from '@/components/kernel/blocks/FiltersBlock'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { PageBlocks, withBlocks, type BlockSpec } from '@/components/kernel/blocks/PageBlocks'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import { FieldView } from '@/components/kernel/fields/FieldView'
import { ProjectedForm, type SubmitResult } from '@/components/kernel/forms/ProjectedForm'
import { AppNav, MobileNav, type NavItem } from '@/components/kernel/nav/AppNav'
import { Breadcrumbs } from '@/components/kernel/nav/Breadcrumbs'
import { Pagination } from '@/components/kernel/nav/Pagination'
import { AppShell } from '@/components/layout/shell'
import { Grid, Split } from '@/components/layout/primitives'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/disclosure'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { Thread } from '@/components/ui/thread'
import type { ModelMeta } from '@/lib/contract/types'
import { formatMoney } from '@/lib/money'
import { CategoryShowcase, MarketingCTA, MarketingFooter, MercantileHero, WholesaleMetricsStrip } from '@/features/marketing/Marketing'
import { BuyerSellerValueSplit, InventoryTrustProof, MarketingHeader, MarketMeshVisualization, TradeFlowStory } from '@/features/marketing/MarketingInteractive'
import { CategoryContractBuilder } from '@/features/categories/CategoryContractBuilder'
import { ProductComparisonBlock } from '@/features/comparison/ProductComparisonBlock'
import { FulfillmentPickPackBlock } from '@/features/fulfillment/FulfillmentPickPackBlock'
import { catalogue, chainOf, rowFor } from '../catalogue'
import { DEMO_NOW, buyers, images, orderMeta, orders, organizationMeta, organizationValues, people, productMeta, products, sellers, stockFor } from '../fixtures'
import { Plate, Plates, useJump } from '../kit'
import { messages, orderEvents, sellerMetrics } from './blocks'
import {
  apiTokens, approvalSteps, checkoutGroups, deliveryEvents, editorMeta, mediaItems, movements, mwangazaGroup, naivasha, notifications,
  onboardingHistory, orderTransitions, period, preferences, priceRules, pwaniGroup, quoteLines, reorderLines, returnClaim, returnEvidence, riftGroup,
  sellerDocuments, tiers, traceEvents, variantAttributes, variantRows, webhookEndpoints,
} from './commerce'
import { MarketShelf, buyerValue, categories, compareProducts, comparisonFields, flowSteps, maizeContract, pickLines, sellerValue, trustProofs, tradeTerms } from './divergent'
import { navItems } from './kernel'

/** Block chain as ordered data, each step linked to its inventory row. */
function Chain({ code }: { code: string }) {
  const jump = useJump()
  const entry = catalogue.find(e => e.code === code)!
  const steps = chainOf(entry)
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label={`${entry.name} block order`}>
      {steps.map((s, i) => {
        const target = rowFor(s)
        return (
          <li key={i} className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-2 py-1 text-sm">
              <span className="font-mono text-xs text-muted tabular">{i + 1}</span>
              {target ? (
                <a href={`?open=${target.code}#row-${target.code}`} onClick={ev => { ev.preventDefault(); jump(target.code) }} className="font-medium hover:text-primary hover:underline">{s}</a>
              ) : <span className="font-medium">{s}</span>}
              {target ? <code className="font-mono text-xs text-muted">{target.code}</code> : null}
            </span>
            {i < steps.length - 1 ? <Icon icon={ArrowRight} className="text-border-strong" /> : null}
          </li>
        )
      })}
    </ol>
  )
}

const ok = async (): Promise<SubmitResult> => { await new Promise(r => setTimeout(r, 700)); return { ok: true } }
const noop = async () => { await new Promise(r => setTimeout(r, 500)) }

/** A page frame for templates without the app shell. */
function Page({ children, density }: { children: ReactNode; density?: 'compact' | 'comfortable' }) {
  return <div className="@container flex flex-col gap-5 rounded-md border border-border bg-background p-4 @xl:p-5" data-density={density}>{children}</div>
}

const buyerNav: NavItem[] = [
  { key: 'home', label: 'Overview', href: '#', icon: LayoutDashboard },
  { key: 'shop', label: 'Shop', href: '#', icon: Store },
  { key: 'cart', label: 'Cart', href: '#', icon: ShoppingCart, count: 3 },
  { key: 'orders', label: 'Orders', href: '#', icon: Package },
  { key: 'quotes', label: 'Quotes', href: '#', icon: ReceiptText, count: 1 },
  { key: 'approvals', label: 'Approvals', href: '#', icon: ShieldCheck, count: 2 },
  { key: 'notifications', label: 'Notifications', href: '#', icon: Bell, count: 3 },
  { key: 'settings', label: 'Settings', href: '#', icon: Settings },
]
const adminNav: NavItem[] = [
  { key: 'home', label: 'Marketplace', href: '#', icon: LayoutDashboard },
  { key: 'sellers', label: 'Seller reviews', href: '#', icon: Building2, count: 4 },
  { key: 'categories', label: 'Category contracts', href: '#', icon: ScrollText },
  { key: 'integrations', label: 'Integrations', href: '#', icon: Webhook },
  { key: 'members', label: 'Staff', href: '#', icon: Users },
]

/** Authenticated templates sit in the real shell: the rail shows from the shell's own breakpoint. */
function Shell({ nav, current, children, density }: { nav: NavItem[]; current: string; children: ReactNode; density?: 'compact' | 'comfortable' }) {
  return (
    <AppShell
      className="min-h-0 overflow-hidden rounded-md border border-border"
      nav={<AppNav items={nav} current={current} brand={<BrandLogo variant="lockup" width={160} className="-m-2" />} />}
      header={<div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 lg:hidden"><MobileNav items={nav} current={current} brand={<BrandLogo variant="lockup" width={160} className="-m-2" />} /><BrandLogo variant="lockup" width={160} className="-m-3" /></div>}
    >
      <div className="@container flex flex-col gap-5 p-4 @xl:p-5" data-density={density}>{children}</div>
    </AppShell>
  )
}

function Landing() {
  return (
    <div className="overflow-hidden border border-border bg-background">
      <MarketingHeader categories={categories} />
      {/* Commerce first (category discovery straight after the hero), then the mechanisms; every section
          sits between full-width rules on one 12-column measure, not in its own card. */}
      <div className="@container flex flex-col divide-y divide-border px-4 @xl:px-8 [&>*]:py-12 [&>*:first-child]:pt-0">
        <MercantileHero board={<MarketShelf />} />
        <CategoryShowcase categories={categories} />
        <BuyerSellerValueSplit buyer={buyerValue} seller={sellerValue} />
        <MarketMeshVisualization mode="animated" />
        <TradeFlowStory steps={flowSteps()} />
        <InventoryTrustProof proofs={trustProofs()} />
        <div className="!border-t-0"><MarketingCTA /></div>
      </div>
      <MarketingFooter />
    </div>
  )
}

const facetMeta: ModelMeta = { ...productMeta, fields: [...productMeta.fields.filter(f => ['stock_status', 'unit_price', 'seller'].includes(f.name))] }

function CategoryResults() {
  return (
    <Page>
      <HeaderBlock source="explicit" title="Flour & grains" description="Maize flour, wheat flour and rice from approved Kenyan wholesalers." count={64} breadcrumbs={[{ label: 'Catalogue', href: '#' }, { label: 'Flour & grains' }]} />
      <Split ratio="aside-first">
        <FacetFilterPanel meta={facetMeta} layout="sidebar" counts={{ stock_status: { available: 52, low: 9, reserved: 3, out_of_stock: 4 } }} />
        <div className="flex min-w-0 flex-col gap-4">
          <ListBlock meta={productMeta} records={products.slice(0, 6)} intent="card" href={() => '#product'} now={DEMO_NOW} />
          <Pagination from={1} to={24} total={64} noun={{ one: 'product', other: 'products' }} nextHref="?cursor=eyJpZCI6MjR9" />
        </div>
      </Split>
    </Page>
  )
}

function ProductDetail() {
  const p = products[0]!
  return (
    <Page>
      <Breadcrumbs items={[{ label: 'Catalogue', href: '#' }, { label: 'Flour & grains', href: '#' }, { label: String(p.name) }]} />
      <Split ratio="media-first">
        <div className="overflow-hidden rounded-md border border-border bg-surface"><FieldView field={productMeta.fields.find(f => f.name === 'image')!} value={images.maize} context="media" /></div>
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">{String(p.name)}</h2>
          <p className="text-md text-muted">Bale of 12 × 2 kg, sold by <b className="font-semibold text-foreground">{sellers.mwangaza.label}</b>, Nakuru</p>
          <span className="font-display text-4xl font-extrabold tabular">{formatMoney('1740.00')} <span className="font-sans text-md font-normal text-muted">per bale</span></span>
          <StockAvailabilityIndicator stock={stockFor['p-mvn-2k']!} variant="full" />
          <PriceTierTable tiers={tiers} unit="bale" quantity={5} density="compact" />
          <div className="flex flex-wrap gap-2"><Button variant="primary" size="lg">Add 5 bales to cart</Button><Button variant="secondary" size="lg">Request quote</Button></div>
        </div>
      </Split>
      <RelatedBlock title="More from Mwangaza" meta={productMeta} records={[products[4]!]} intent="card" density="compact" now={DEMO_NOW} />
    </Page>
  )
}

function Comparison() {
  return (
    <Page>
      <HeaderBlock source="explicit" title="Compare maize flour" description="3 products on the Maize flour v3 contract's comparable fields." breadcrumbs={[{ label: 'Flour & grains', href: '#' }, { label: 'Compare' }]} actions={<Button variant="secondary">Add a product</Button>} />
      <ProductComparisonBlock products={compareProducts} fields={comparisonFields} />
    </Page>
  )
}

function CartTemplate() {
  return (
    <Page>
      <HeaderBlock source="explicit" title="Cart" variant="compact" description="3 sellers, 5 lines" />
      <CartBlock state="repricing" groups={[mwangazaGroup, riftGroup('repricing'), pwaniGroup]} approvalThreshold="250000.00" />
    </Page>
  )
}

const checkoutMeta: ModelMeta = {
  key: 'checkout', label: 'Checkout', list: { fields: [], defaultPageSize: 1, maxPageSize: 1 },
  fields: [
    { name: 'delivery_address', type: 'address', widget: 'address', label: 'Deliver to', required: true },
    { name: 'mpesa_phone', type: 'string', widget: 'phone', label: 'M-Pesa number', required: true, help: 'SellaPay sends the payment prompt to this phone.' },
  ],
}

function Checkout() {
  const [holdUntil] = useState(() => new Date(Date.now() + 660_000).toISOString())
  return (
    <Page density="compact">
      <HeaderBlock source="explicit" title="Checkout" variant="compact" description="SM-ORD-004215, 2 sellers" />
      <CheckoutSummaryBlock step="payment" state="valid" groups={checkoutGroups} address={naivasha}>
        <ReservationIndicator reservation={{ id: 'RSV-88213', quantity: 24, unit: 'bale', status: 'active', expiresAt: holdUntil, product: 'Mavuno Maize Flour 2 kg', orderReference: 'SM-ORD-004215' }} variant="full" />
        <ReservationCountdown expiresAt={holdUntil} totalSeconds={900} />
        <ProjectedForm meta={checkoutMeta} mode="edit" initial={{ delivery_address: naivasha, mpesa_phone: '+254712345678' }} onSubmit={ok} submitLabel="Send M-Pesa prompt" />
        <PaymentStatusPanel state="pending" amount="95910.00" orderReference="SM-ORD-004215" phone="+254712345678" transactionId="TXN-1770727500-12345" sentAt="2026-10-12T11:30:00+03:00" />
      </CheckoutSummaryBlock>
    </Page>
  )
}

const buyerMetrics: Metric[] = [
  { key: 'spend', label: 'Spend this month', value: 'KES 412,560', comparison: { label: 'vs September', delta: '+8.1%', direction: 'up', good: true } },
  { key: 'approvals', label: 'Orders awaiting approval', value: '2', tone: 'info', note: 'Above the KES 250,000 limit' },
  { key: 'deliveries', label: 'Deliveries due today', value: '2', note: 'Rift Express, own fleet' },
]
const quoteMeta: ModelMeta = {
  key: 'quote', label: 'Quote', labelPlural: 'Quotes', displayField: 'reference',
  list: { fields: ['reference', 'seller', 'status', 'total', 'expires_at'], defaultPageSize: 25, maxPageSize: 100 },
  fields: [
    { name: 'reference', type: 'string', widget: 'code', label: 'Quote', readOnly: true },
    { name: 'seller', type: 'relation', widget: 'relation', label: 'Seller', relation: { model: 'organization', display: 'name' } },
    { name: 'status', type: 'enum', widget: 'status', label: 'Status', readOnly: true, choices: [{ value: 'requested', label: 'Requested', tone: 'info' }, { value: 'responded', label: 'Responded', tone: 'signal' }, { value: 'accepted', label: 'Accepted', tone: 'success' }, { value: 'expired', label: 'Expired', tone: 'neutral' }] },
    { name: 'total', type: 'decimal', widget: 'currency', label: 'Total', currency: 'KES', decimalPlaces: 2, readOnly: true },
    { name: 'expires_at', type: 'datetime', widget: 'relative-time', label: 'Expires', readOnly: true },
  ],
}
const quotes = [
  { id: 'q1', reference: 'SM-QT-000318', seller: sellers.mwangaza, status: 'responded', total: '147900.00', expires_at: '2026-10-16T17:00:00+03:00' },
  { id: 'q2', reference: 'SM-QT-000322', seller: sellers.lakeside, status: 'requested', total: '64000.00', expires_at: '2026-10-19T17:00:00+03:00' },
  { id: 'q3', reference: 'SM-QT-000301', seller: sellers.rift, status: 'accepted', total: '147500.00', expires_at: '2026-10-10T17:00:00+03:00' },
]

function BuyerDashboard() {
  return (
    <Shell nav={buyerNav} current="home" density="comfortable">
      <HeaderBlock source="explicit" title="Good morning, Grace" variant="compact" description={buyers.wanjiru.label} actions={<NotificationBell notifications={notifications} now={DEMO_NOW} allHref="#notifications" />} />
      <StatsBlock metrics={buyerMetrics} />
      <Grid columns={2}>
        <ListBlock meta={orderMeta} records={orders.slice(0, 3)} density="compact" narrow="priority" now={DEMO_NOW} caption="Recent orders" />
        <ApprovalFlowBlock state="pending" policyName="Restock policy" threshold="250000.00" orderTotal="312400.00" steps={approvalSteps} canDecide />
        <ListBlock meta={quoteMeta} records={quotes} density="compact" narrow="priority" now={DEMO_NOW} caption="Quotes" />
        <NotificationsBlock notifications={notifications.slice(0, 4)} layout="panel" now={DEMO_NOW} />
      </Grid>
    </Shell>
  )
}

function SellerDashboard() {
  return (
    <Shell nav={navItems} current="home" density="compact">
      <HeaderBlock source="explicit" title="Good morning, Faith" variant="compact" description="Mwangaza Wholesalers, Nakuru" />
      <SellerAnalyticsGrid periods={{ '7d': period(7, 'KES 1.62M'), '30d': period(30, 'KES 6.94M'), '90d': period(90, 'KES 19.8M') }} definitionVersion="seller.metrics@2" />
      <Grid columns={2}>
        <ListBlock meta={orderMeta} records={orders.slice(0, 3)} density="compact" narrow="priority" now={DEMO_NOW} caption="Orders to confirm" />
        <ActivityBlock events={orderEvents.slice(0, 4)} density="compact" now={DEMO_NOW} title="Today" />
      </Grid>
    </Shell>
  )
}

function CatalogManagement() {
  const [values, setValues] = useState<FilterValues>({ stock_status: { op: 'in', value: ['low', 'out_of_stock'] } })
  return (
    <Shell nav={navItems} current="products" density="compact">
      <HeaderBlock source="explicit" title="Products" count={312} variant="compact" actions={<Button variant="primary">Add product</Button>} />
      <FiltersBlock meta={productMeta} values={values} onChange={setValues} layout="collapsed" />
      <ListBlock meta={productMeta} records={products.slice(0, 4)} density="compact" narrow="priority" href={() => '#product'} now={DEMO_NOW} />
      <ProductEditorBlock meta={editorMeta} mode="edit" status="draft" category="Flour & grains · Maize flour v3" initial={{ name: 'Mavuno Maize Flour 2 kg', brand: 'Mavuno', pack_size: '2kg', fortified: true, net_weight: '24.00' }} onSubmit={ok} />
      <VariantMatrixEditor attributes={variantAttributes} rows={variantRows} />
      <MediaManager items={mediaItems} maxBytes={10_485_760} />
      <PriceBookEditor rules={priceRules} unit="bale" product="Mavuno Maize Flour 2 kg" />
    </Shell>
  )
}

const stockMeta: ModelMeta = {
  key: 'stock_item', label: 'Stock item', displayField: 'name', list: { fields: ['name'], defaultPageSize: 25, maxPageSize: 100 },
  fields: [
    { name: 'name', type: 'string', widget: 'text', label: 'Product', readOnly: true },
    { name: 'quantity', type: 'integer', widget: 'quantity', label: 'Quantity', unit: 'bale', required: true },
    { name: 'reason', type: 'text', widget: 'textarea', label: 'Reason', required: true, maxLength: 300, help: 'Kept in the movement history; attach photos for damage.' },
  ],
  actions: [
    { name: 'receive', label: 'Receive stock', kind: 'command', policy: 'inventory.receive', tone: 'primary', icon: 'package-check', input: ['quantity'] },
    { name: 'adjust', label: 'Record adjustment', kind: 'command', policy: 'inventory.adjust', icon: 'package-minus', confirm: true, input: ['quantity', 'reason'] },
  ],
}

function Inventory() {
  return (
    <Shell nav={navItems} current="inventory" density="compact">
      <HeaderBlock source="explicit" title="Mavuno Maize Flour 2 kg" variant="compact" description="MVN-2K-12, bay C-04" breadcrumbs={[{ label: 'Inventory', href: '#' }, { label: 'MVN-2K-12' }]}
        status={<StockAvailabilityIndicator stock={stockFor['p-mvn-2k']!} />}
        actions={<ActionBar meta={stockMeta} record={{ id: 's1', name: 'Mavuno Maize Flour 2 kg', _can: ['receive', 'adjust'] }} onRun={noop} />} />
      <StockAvailabilityIndicator stock={stockFor['p-mvn-2k']!} variant="full" />
      <InventoryLedgerBlock movements={movements} unit="bale" now={DEMO_NOW} />
    </Shell>
  )
}

function Orders() {
  return (
    <Shell nav={navItems} current="orders" density="compact">
      <HeaderBlock source="meta" meta={orderMeta} count={27} variant="compact" />
      <ListBlock meta={orderMeta} records={orders.slice(0, 3)} density="compact" narrow="priority" selected={['o-4215']} href={() => '#order'} now={DEMO_NOW} />
      <Split ratio="wide-aside">
        <div className="flex min-w-0 flex-col gap-4">
          <DetailBlock meta={orderMeta} record={orders[0]} onRun={noop} now={DEMO_NOW} />
          <OrderTimelineBlock transitions={orderTransitions} now={DEMO_NOW} next={['Ship the remaining lines', 'Close as fulfilled']} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <PaymentStatusPanel state="reconciled" amount="48250.00" orderReference="SM-ORD-004215" transactionId="TXN-1770727500-12345" sentAt="2026-10-12T11:30:00+03:00" confirmations={2} />
          <DeliveryTrackingBlock status="in_transit" carrier="Rift Express" reference="RX-552019" windowStart="2026-10-12T12:00:00+03:00" windowEnd="2026-10-12T14:00:00+03:00" events={deliveryEvents} mapHref="#" now={DEMO_NOW} />
        </div>
      </Split>
    </Shell>
  )
}

const pickQueue = orders.filter(o => ['confirmed', 'picking'].includes(String(o.status))).slice(0, 3)

function Warehouse() {
  return (
    <Page density="compact">
      <HeaderBlock source="explicit" title="Picking queue" variant="compact" description="Nakuru depot, shift 07:00 to 15:00" />
      <ListBlock meta={orderMeta} records={pickQueue.length ? pickQueue : orders.slice(0, 2)} density="compact" narrow="collapse" now={DEMO_NOW} caption="Ready to pick" />
      <Split ratio="wide-aside">
        <FulfillmentPickPackBlock order="SM-ORD-004215, Wanjiru General Stores" lines={pickLines} />
        <FieldInput field={{ name: 'handover_photo', type: 'file', widget: 'image', label: 'Handover photo', help: 'Photo of the loaded bales with the delivery note visible.', accept: ['image/jpeg', 'image/png'] }} value={{ state: 'empty' }} onChange={() => undefined} />
      </Split>
    </Page>
  )
}

function Quotes() {
  return (
    <Shell nav={navItems} current="quotes" density="compact">
      <HeaderBlock source="explicit" title="Quotes" count={3} variant="compact" />
      <ListBlock meta={quoteMeta} records={quotes} density="compact" narrow="priority" now={DEMO_NOW} />
      <Split ratio="half">
        <QuoteDecisionPanel reference="SM-QT-000318" buyer={buyers.wanjiru.label} lines={quoteLines} expiresAt="2026-10-16T17:00:00+03:00" />
        <ChatBlock title="Quote SM-QT-000318" messages={messages} canInternal now={DEMO_NOW} density="compact" onSend={() => undefined} />
      </Split>
    </Shell>
  )
}

function Approvals() {
  return (
    <Shell nav={buyerNav} current="approvals">
      <HeaderBlock source="explicit" title="Purchase approvals" variant="compact" status={<Stamp tone="info" condition="pending">2 waiting</Stamp>} />
      <Split ratio="wide-aside">
        <ListBlock meta={orderMeta} records={orders.slice(0, 2)} density="compact" narrow="priority" selected={['o-4219']} now={DEMO_NOW} caption="Waiting for you" />
        <ApprovalFlowBlock state="pending" policyName="Restock policy" threshold="250000.00" orderTotal="312400.00" steps={approvalSteps} canDecide />
      </Split>
    </Shell>
  )
}

function Returns() {
  return (
    <Shell nav={navItems} current="orders" density="compact">
      <HeaderBlock source="explicit" title="Returns and disputes" count={2} variant="compact" />
      <Split ratio="half">
        <ReturnDisputeCaseBlock reference="RET-0042" type="damage" status="reviewing" line="Mavuno Maize Flour 2 kg × 3 of 20" reason={returnClaim} evidence={returnEvidence} canDecide openedAt="2026-10-12T09:15:00+03:00" now={DEMO_NOW} />
        <ChatBlock title="RET-0042" messages={messages.slice(0, 1)} canInternal now={DEMO_NOW} density="compact" onSend={() => undefined} />
      </Split>
    </Shell>
  )
}

const healthMetrics: Metric[] = [
  { key: 'sellers', label: 'Sellers awaiting review', value: '4', tone: 'info' },
  { key: 'contracts', label: 'Category contracts published', value: '2' },
  { key: 'webhooks', label: 'Webhook deliveries retrying', value: '1', tone: 'warning', note: 'Mwangaza ERP, HTTP 503' },
]

function MarketplaceAdmin() {
  return (
    <Shell nav={adminNav} current="sellers" density="compact">
      <HeaderBlock source="explicit" title="Marketplace" variant="compact" description="Demo data" />
      <StatsBlock metrics={healthMetrics} />
      <SellerOnboardingReviewBlock seller="Lakeside Supplies" location="Kisumu" status="under_review" documents={sellerDocuments} history={onboardingHistory} />
      <CategoryContractBuilder category="Flour & grains · Maize flour" version={3} attributes={maizeContract} />
      <ReconciliationTraceBlock correlationId="cor_SM-ORD-004215" events={traceEvents} now={DEMO_NOW} />
    </Shell>
  )
}

const deliveries: ActivityEvent[] = [
  { id: 'd3', at: '2026-10-12T11:22:30+03:00', kind: 'webhook', title: 'inventory.reserved to erp.mwangaza-demo.co.ke', detail: 'HTTP 503, attempt 3, retrying', tone: 'warning', certainty: 'awaiting' },
  { id: 'd2', at: '2026-10-12T11:18:04+03:00', kind: 'webhook', title: 'order.submitted to hooks.mwangaza-demo.co.ke', detail: 'HTTP 200 in 412 ms', tone: 'success' },
  { id: 'd1', at: '2026-10-12T08:30:11+03:00', kind: 'webhook', title: 'order.shipped to hooks.mwangaza-demo.co.ke', detail: 'HTTP 200 in 380 ms', tone: 'success' },
]

function Integrations() {
  return (
    <Shell nav={adminNav} current="integrations" density="compact">
      <HeaderBlock source="explicit" title="Integrations" variant="compact" description="Scoped API tokens and signed webhooks" />
      <IntegrationPanel tokens={apiTokens} webhooks={webhookEndpoints} now={DEMO_NOW} />
      <ActivityBlock events={deliveries} density="compact" now={DEMO_NOW} title="Webhook deliveries" />
      <ReconciliationTraceBlock correlationId="cor_SM-ORD-004215" events={traceEvents.slice(0, 3)} now={DEMO_NOW} />
    </Shell>
  )
}

/** Generic templates are page definitions: the visual twin of a BlockSpec[] (spec p.58). */
const registry = withBlocks({ pagination: Pagination })
const listDefinition: BlockSpec[] = [
  { block: 'header', props: { source: 'meta', meta: orderMeta, count: 27, variant: 'compact' } },
  { block: 'filters', props: { meta: orderMeta, values: { status: { op: 'in', value: ['submitted', 'confirmed'] } }, onChange: () => undefined, layout: 'collapsed' } },
  { block: 'list', props: { meta: orderMeta, records: orders, density: 'compact', narrow: 'priority' } },
  { block: 'pagination', props: { from: 1, to: 5, total: 27, noun: { one: 'order', other: 'orders' }, nextHref: '?cursor=eyJpZCI6NX0' } },
]
const detailDefinition: BlockSpec[] = [
  { block: 'header', props: { source: 'record', meta: orderMeta, record: orders[0], breadcrumbs: [{ label: 'Orders', href: '#' }, { label: String(orders[0]!.order_number) }] } },
  { block: 'split', ratio: 'sidebar', children: [[{ block: 'detail', props: { meta: orderMeta, record: orders[0] } }], [{ block: 'activity', props: { events: orderEvents.slice(0, 4), density: 'compact' } }]] },
  { block: 'related', props: { title: 'Other orders from this buyer', meta: orderMeta, records: orders.slice(1, 3), density: 'compact' } },
]
const dashboardDefinition: BlockSpec[] = [
  { block: 'header', props: { source: 'explicit', title: 'Overview', variant: 'compact' } },
  { block: 'stats', props: { metrics: sellerMetrics } },
  { block: 'grid', columns: 2, children: [[{ block: 'list', props: { meta: orderMeta, records: orders.slice(0, 3), density: 'compact', narrow: 'priority', caption: 'Recent orders' } }], [{ block: 'activity', props: { events: orderEvents.slice(0, 4), density: 'compact', title: 'Today' } }]] },
]

function Definition({ page }: { page: BlockSpec[] }) {
  return <Page density="compact"><PageBlocks page={page} ctx={{ now: DEMO_NOW }} registry={registry} /></Page>
}

const signInMeta: ModelMeta = {
  key: 'session', label: 'Sign in', list: { fields: [], defaultPageSize: 1, maxPageSize: 1 },
  fields: [{ name: 'phone', type: 'string', widget: 'phone', label: 'Mobile number', required: true, help: 'We send a 6-digit code to this phone.' }],
}
const registerMeta: ModelMeta = {
  ...organizationMeta,
  fields: [
    { name: 'email', type: 'email', widget: 'email', label: 'Work email', required: true },
    { name: 'phone', type: 'string', widget: 'phone', label: 'Mobile number', required: true, help: 'We send a 6-digit code to verify it.' },
    ...organizationMeta.fields.filter(f => ['name', 'organization_type'].includes(f.name)),
  ],
}

function Auth() {
  return (
    <div className="@container rounded-md border border-border bg-background p-4 @xl:p-8">
      <div className="mx-auto flex max-w-[26rem] flex-col gap-6">
        <BrandLogo variant="lockup" width={180} className="-m-3 self-center" />
        <Tabs defaultValue="sign-in">
          <TabsList variant="boxed"><TabsTrigger value="sign-in">Sign in</TabsTrigger><TabsTrigger value="register">Create an account</TabsTrigger></TabsList>
          <TabsContent value="sign-in" className="pt-4"><ProjectedForm meta={signInMeta} mode="command" recipe="auth" onSubmit={ok} submitLabel="Send sign-in code" /></TabsContent>
          <TabsContent value="register" className="pt-4"><ProjectedForm meta={registerMeta} mode="registration" recipe="auth" onSubmit={ok} submitLabel="Send verification code" /></TabsContent>
        </Tabs>
        <ErrorState kind="rate-limit" title="Too many codes requested" detail="For your security, wait before asking for another code." retryAfterSeconds={45} size="inline" />
        <p className="text-center text-sm text-muted">Accounts are reviewed before trading starts.</p>
      </div>
    </div>
  )
}

const memberMeta: ModelMeta = {
  key: 'membership', label: 'Member', labelPlural: 'Members', displayField: 'name',
  list: { fields: ['name', 'email', 'role_key', 'status'], defaultPageSize: 25, maxPageSize: 100 },
  fields: [
    { name: 'name', type: 'string', widget: 'text', label: 'Name', readOnly: true },
    { name: 'email', type: 'email', widget: 'email', label: 'Email', readOnly: true },
    { name: 'role_key', type: 'enum', widget: 'select', label: 'Role', choices: [{ value: 'seller_manager', label: 'Seller manager' }, { value: 'warehouse_operator', label: 'Warehouse operator' }, { value: 'buyer_owner', label: 'Buyer owner' }, { value: 'buyer_purchaser', label: 'Buyer purchaser' }] },
    { name: 'status', type: 'enum', widget: 'status', label: 'Status', readOnly: true, choices: [{ value: 'invited', label: 'Invited', tone: 'info' }, { value: 'active', label: 'Active', tone: 'success' }, { value: 'suspended', label: 'Suspended', tone: 'warning' }, { value: 'removed', label: 'Removed', tone: 'neutral' }] },
  ],
}
const members = [
  { id: 'u1', name: people.faith, email: 'faith@mwangaza-demo.co.ke', role_key: 'seller_manager', status: 'active' },
  { id: 'u2', name: people.peter, email: 'peter@mwangaza-demo.co.ke', role_key: 'warehouse_operator', status: 'active' },
  { id: 'u3', name: 'Pending invitation', email: 'stores@mwangaza-demo.co.ke', role_key: 'warehouse_operator', status: 'invited' },
]

function SettingsTemplate() {
  return (
    <Shell nav={navItems} current="settings">
      <HeaderBlock source="explicit" title="Organization settings" variant="compact" description={sellers.mwangaza.label} status={<Stamp tone="success">Approved</Stamp>} />
      <Tabs defaultValue="profile">
        <TabsList><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="members" count={3}>Members</TabsTrigger><TabsTrigger value="addresses">Addresses</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger></TabsList>
        <TabsContent value="profile" className="pt-4"><ProjectedForm meta={organizationMeta} fields={['name', 'tax_identifier', 'support_email', 'support_phone']} mode="edit" initial={organizationValues} onSubmit={ok} /></TabsContent>
        <TabsContent value="members" className="flex flex-col gap-3 pt-4"><div className="flex justify-end"><Button variant="primary">Invite member</Button></div><ListBlock meta={memberMeta} records={members} density="compact" narrow="collapse" /></TabsContent>
        <TabsContent value="addresses" className="pt-4"><Grid columns={2}>{[naivasha, { ...naivasha, label: 'Store room', line1: 'Kabati, off Moi South Lake Road' }].map(a => <div key={a.label} className="rounded-md border border-border bg-surface p-4"><FieldView field={{ name: 'address', type: 'address', widget: 'address', label: a.label }} value={a} /></div>)}</Grid></TabsContent>
        <TabsContent value="notifications" className="pt-4"><NotificationPreferencesBlock preferences={preferences} /></TabsContent>
      </Tabs>
    </Shell>
  )
}

function SellerApplication() {
  return (
    <Page>
      <HeaderBlock source="explicit" title="Seller application: Lakeside Supplies" description="Kisumu. Reviews take up to 2 working days once documents are in." status={<Stamp tone="info" condition="pending">Under review</Stamp>} />
      <Thread label="Application" steps={[
        { key: 'details', label: 'Business details', state: 'done' },
        { key: 'documents', label: 'Documents', state: 'current', detail: 'Bank letter has expired' },
        { key: 'review', label: 'Marketplace review', state: 'upcoming' },
        { key: 'active', label: 'Start selling', state: 'upcoming' },
      ]} />
      <WholesaleMetricsStrip metrics={tradeTerms} compact label="Terms of trade" />
      <ProjectedForm meta={organizationMeta} fields={['name', 'organization_type', 'tax_identifier', 'support_email', 'support_phone', 'address', 'delivery_regions']} mode="registration" recipe="stepper" initial={organizationValues} onSubmit={ok} />
      <div className="flex flex-col gap-3">
        <h3 className="font-display text-xl font-bold">Documents</h3>
        <Grid columns={2}>
          {sellerDocuments.map(d => (
            <FieldInput key={d.type} field={{ name: d.type, type: 'file', widget: 'file', label: d.type, help: d.notes ?? (d.expiresAt ? 'Valid to 31 Dec 2026' : undefined), accept: ['application/pdf', 'image/jpeg'] }} value={d.status === 'expired' ? null : d.file} onChange={() => undefined} error={d.status === 'expired' ? 'This letter is older than 90 days. Upload a new one.' : undefined} />
          ))}
        </Grid>
      </div>
    </Page>
  )
}

function Reorder() {
  return (
    <Page>
      <HeaderBlock source="explicit" title="Reorder SM-ORD-004176" variant="compact" description="Placed 14 Sep 2026; 2 lines changed since" breadcrumbs={[{ label: 'Orders', href: '#' }, { label: 'SM-ORD-004176' }, { label: 'Reorder' }]} />
      <ReorderDiffBlock orderReference="SM-ORD-004176" placedOn="2026-09-14T08:15:00+03:00" lines={reorderLines} onAdd={() => undefined} />
      <CartBlock state="repricing" groups={[mwangazaGroup, riftGroup('repricing')]} />
    </Page>
  )
}

function NotificationsTemplate() {
  return (
    <Shell nav={buyerNav} current="notifications">
      <HeaderBlock source="explicit" title="Notifications" variant="compact" description="Orders, approvals, quotes, payments and deliveries" actions={<NotificationBell notifications={notifications} now={DEMO_NOW} />} />
      <Split ratio="wide-aside">
        <NotificationsBlock notifications={notifications} now={DEMO_NOW} onMarkRead={() => undefined} onMarkAllRead={() => undefined} />
        <NotificationPreferencesBlock preferences={preferences} />
      </Split>
    </Shell>
  )
}

const live: Record<string, () => ReactNode> = {
  'L-01': Landing, 'L-02': CategoryResults, 'L-03': ProductDetail, 'L-04': Comparison, 'L-05': CartTemplate, 'L-06': Checkout,
  'L-07': BuyerDashboard, 'L-08': SellerDashboard, 'L-09': CatalogManagement, 'L-10': Inventory, 'L-11': Orders, 'L-12': Warehouse,
  'L-13': Quotes, 'L-14': Approvals, 'L-15': Returns, 'L-16': MarketplaceAdmin, 'L-17': Integrations,
  'L-18': () => <Definition page={listDefinition} />, 'L-19': () => <Definition page={detailDefinition} />, 'L-20': () => <Definition page={dashboardDefinition} />,
  'L-21': Auth, 'L-22': SettingsTemplate, 'L-23': SellerApplication, 'L-24': Reorder, 'L-25': NotificationsTemplate,
}

export default function TemplateSpecimens({ code }: { code: string }) {
  const Live = live[code]
  return (
    <Plates cols={1}>
      <Plate label="Page definition, block order" note="Ordered BlockSpec[] data; divergent sections are registered blocks"><Chain code={code} /></Plate>
      {Live ? <Plate label="Composed" note="Demo data" tone="canvas"><Live /></Plate> : null}
    </Plates>
  )
}
