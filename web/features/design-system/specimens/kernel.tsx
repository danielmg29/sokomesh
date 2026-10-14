'use client'

import { Boxes, ClipboardList, LayoutDashboard, Package, Plus, ReceiptText, Scale, Settings, ShoppingCart, Truck, Users } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { ActionBar, ActionMenu } from '@/components/kernel/actions/ActionBar'
import { BulkActions, type BulkState } from '@/components/kernel/actions/BulkActions'
import { ConfirmAction } from '@/components/kernel/actions/ConfirmAction'
import { kernelBlocks, PageBlocks, type BlockSpec } from '@/components/kernel/blocks/PageBlocks'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { StatusBadge } from '@/components/kernel/feedback/StatusBadge'
import { toastForAction, toastForError } from '@/components/kernel/feedback/toast'
import { FieldDiff, FieldView } from '@/components/kernel/fields/FieldView'
import { FieldFilter, FieldInput } from '@/components/kernel/fields/FieldInput'
import type { FilterValue } from '@/components/kernel/fields/types'
import { ProjectedForm, type SubmitResult } from '@/components/kernel/forms/ProjectedForm'
import { AppNav, MobileNav, type NavItem } from '@/components/kernel/nav/AppNav'
import { Breadcrumbs } from '@/components/kernel/nav/Breadcrumbs'
import { Pagination } from '@/components/kernel/nav/Pagination'
import { CommandPalette } from '@/components/kernel/nav/CommandPalette'
import { Projection } from '@/components/kernel/Projection'
import { intents, surfaces, tones } from '@/components/kernel/recipes/recipes'
import { resolveSlots } from '@/components/kernel/slots/resolve'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { limits } from '@/lib/contract/generated'
import { DEMO_NOW, orderMeta, orders, organizationMeta, organizationValues, placeOptions, productMeta, products } from '../fixtures'
import { Plate, Plates, useDemoRun } from '../kit'

const product = products[0]!
const order = orders[0]!

function Recipes() {
  const slots = resolveSlots(productMeta, product, ['media', 'title', 'subtitle', 'badge', 'figure', 'meta', 'timestamp', 'owner', 'actions'])
  return (
    <Plates cols={2}>
      <Plate label="Axes" note="Every recipe uses the same four">
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-md">
          <dt className="font-semibold">intent</dt><dd className="font-mono text-sm">{intents.join(' · ')}</dd>
          <dt className="font-semibold">density</dt><dd className="font-mono text-sm">compact, comfortable, spacious</dd>
          <dt className="font-semibold">tone</dt><dd className="font-mono text-sm">{tones.join(' · ')}</dd>
          <dt className="font-semibold">surface</dt><dd className="font-mono text-sm">{surfaces.join(' · ')}</dd>
        </dl>
      </Plate>
      <Plate label="Slots resolved from product metadata" note="No field names in kernel code">
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          {(['media', 'title', 'subtitle', 'badge', 'figure', 'timestamp', 'owner'] as const).map(k => <Fragment key={k}><dt className="font-semibold">{k}</dt><dd className="font-mono">{slots[k]?.field.name ?? 'none'}</dd></Fragment>)}
          <dt className="font-semibold">meta</dt><dd className="font-mono">{slots.meta.map(m => m.field.name).join(', ')}</dd>
        </dl>
      </Plate>
      <Plate label="Resolution order" span>
        <ol className="flex flex-col gap-1 text-md">
          {['Explicit prop at the call site', 'Feature override (features/<model>/overrides.ts)', 'Inference from contract metadata and context', 'User density preference', 'Recipe defaults'].map((t, i) => <li key={t}><span className="mr-2 font-semibold tabular text-muted">{i + 1}</span>{t}</li>)}
        </ol>
      </Plate>
    </Plates>
  )
}

function ProjectionSpecimen() {
  const { run, pending } = useDemoRun()
  return (
    <Plates cols={2}>
      <Plate label="context=list · media (inferred: has image)"><div className="max-w-xs"><Projection meta={productMeta} record={product} context="list" onRun={run} pending={pending} now={DEMO_NOW} href="#product" /></div></Plate>
      <Plate label="override intent=row · compact"><Projection meta={productMeta} record={products[1]!} context="list" override={{ intent: 'row', density: 'compact' }} onRun={run} now={DEMO_NOW} href="#product" /></Plate>
      <Plate label="context=detail" span><Projection meta={orderMeta} record={order} context="detail" onRun={run} pending={pending} now={DEMO_NOW} /></Plate>
      <Plate label="context=picker · relation"><Projection meta={productMeta} record={products[3]!} context="picker" /></Plate>
      <Plate label="intent=audit (immutable models)"><Projection meta={{ ...orderMeta, immutable: true }} record={orders[3]!} context="list" now={DEMO_NOW} /></Plate>
      <Plate label="tone=warning · surface=inset"><Projection meta={productMeta} record={products[1]!} context="list" override={{ intent: 'card', tone: 'warning', surface: 'inset' }} now={DEMO_NOW} /></Plate>
      <Plate label="context=dashboard · stat"><Projection meta={orderMeta} record={order} context="dashboard" now={DEMO_NOW} /></Plate>
    </Plates>
  )
}

function Dispatchers() {
  const f = productMeta.fields.find(x => x.name === 'unit_price')!
  const [v, setV] = useState<unknown>('1740.00')
  const [flt, setFlt] = useState<FilterValue | undefined>({ op: 'range', value: { min: '1500', max: '5000' } })
  return (
    <Plates cols={2}>
      <Plate label="FieldView"><FieldView field={f} value={v} /></Plate>
      <Plate label="FieldInput"><FieldInput field={f} value={v} onChange={setV} /></Plate>
      <Plate label="FieldFilter"><FieldFilter field={f} value={flt} onChange={setFlt} /></Plate>
      <Plate label="FieldDiff"><FieldDiff field={f} before="1740.00" after={v} /></Plate>
      <Plate label="Unknown widget" note="Caught by the contract test; flagged at runtime" span><FieldView field={{ name: 'x', type: 'string', widget: 'barcode' }} value="6161100100014" /></Plate>
    </Plates>
  )
}

const succeed = async (): Promise<SubmitResult> => { await new Promise(r => setTimeout(r, 800)); return { ok: true } }

function Forms() {
  const fields = ['name', 'legal_name', 'organization_type', 'tax_identifier', 'support_email', 'support_phone']
  return (
    <Plates cols={2}>
      <Plate label="recipe=inline, mode=edit, editing to saved"><ProjectedForm meta={organizationMeta} fields={fields} mode="edit" initial={organizationValues} onSubmit={succeed} /></Plate>
      <Plate label="state=invalid (server VALIDATION)"><ProjectedForm meta={organizationMeta} fields={['name', 'tax_identifier', 'support_email']} mode="edit" initial={{ ...organizationValues, tax_identifier: 'P05123' }} onSubmit={succeed} initialPhase="invalid" initialError={{ code: 'VALIDATION', detail: 'Some details need attention before this can be saved.', fields: { tax_identifier: ['Use eleven characters, for example P051234567X.'] }, retryable: false }} /></Plate>
      <Plate label="state=conflict (stale version)" span><ProjectedForm meta={organizationMeta} fields={['name', 'support_phone', 'payment_terms_days']} mode="edit" initial={organizationValues} onSubmit={succeed} initialPhase="conflict" initialError={{ code: 'CONFLICT', detail: 'Faith Chebet saved this organization 2 minutes ago.', fields: {}, retryable: false }} initialTheirs={{ name: 'Mwangaza Wholesale Depot', support_phone: '+254722123456', payment_terms_days: 21 }} /></Plate>
      <Plate label="recipe=stepper · mode=registration" span><ProjectedForm meta={organizationMeta} fields={['name', 'organization_type', 'tax_identifier', 'support_email', 'support_phone', 'address', 'location', 'delivery_regions', 'accepts_substitutes', 'description', 'registration_certificate']} mode="registration" recipe="stepper" initial={{ organization_type: 'seller' }} options={{ location: placeOptions }} onSubmit={succeed} submitLabel="Submit for review" /></Plate>
      <Plate label="recipe=sheet · mode=create"><ProjectedForm meta={organizationMeta} fields={['name', 'organization_type', 'support_email']} mode="create" recipe="sheet" trigger={<Button variant="primary" leadingIcon={Plus}>New organization</Button>} onSubmit={succeed} /></Plate>
      <Plate label="recipe=auth"><ProjectedForm meta={{ ...organizationMeta, fields: [{ name: 'email', type: 'email', widget: 'email', label: 'Email', required: true }, { name: 'phone', type: 'string', widget: 'phone', label: 'Mobile number', required: true, help: 'We send a 6-digit code to verify it.' }] }} mode="registration" recipe="auth" onSubmit={succeed} submitLabel="Send verification code" /></Plate>
      <Plate label="Restricted field (fieldPolicy write)" span><ProjectedForm meta={organizationMeta} fields={['credit_limit', 'payment_terms_days']} mode="edit" initial={organizationValues} restricted={{ credit_limit: 'Only marketplace finance can change credit limits.' }} onSubmit={succeed} /></Plate>
    </Plates>
  )
}

function ActionBarSpecimen() {
  const { run, pending } = useDemoRun()
  return (
    <Plates cols={1}>
      <Plate label="Order submitted · confirm, print, cancel (confirm + input)"><ActionBar meta={orderMeta} record={order} onRun={run} pending={pending} /></Plate>
      <Plate label="Order confirmed · confirm unavailable with reason" note="Hover or focus the disabled button"><ActionBar meta={orderMeta} record={{ ...orders[1]!, _can: ['confirm', 'start_picking', 'print'] }} onRun={run} pending={pending} /></Plate>
      <Plate label="Product out of stock · add to cart blocked by state"><ActionBar meta={productMeta} record={products[2]!} onRun={run} pending={pending} /></Plate>
      <Plate label="FLOW · large touch size"><ActionBar meta={orderMeta} record={orders[1]!} onRun={run} pending={pending} size="lg" /></Plate>
      <Plate label="No permitted actions" note="The API refuses them too"><ActionBar meta={orderMeta} record={{ ...order, _can: [] }} onRun={run} /><p className="text-md text-muted">Nothing renders: this role has no permitted commands on the order.</p></Plate>
    </Plates>
  )
}

function ActionMenuSpecimen() {
  const { run } = useDemoRun()
  return (
    <Plates cols={3}>
      <Plate label="Overflow · compact"><ActionMenu meta={orderMeta} record={order} onRun={run} density="compact" /></Plate>
      <Plate label="Inline + overflow"><ActionBar meta={orderMeta} record={order} onRun={run} inline={1} /></Plate>
      <Plate label="Restricted" note="No trigger rendered"><ActionMenu meta={orderMeta} record={{ ...order, _can: [] }} onRun={run} /><p className="text-md text-muted">No permitted commands, so no menu.</p></Plate>
    </Plates>
  )
}

function BulkSpecimen() {
  const [state, setState] = useState<BulkState>({ phase: 'idle' })
  const [selected, setSelected] = useState(12)
  const actions = [{ name: 'publish', label: 'Publish', kind: 'command' as const, policy: 'product.publish', tone: 'primary' as const, icon: 'check' }, { name: 'archive', label: 'Archive', kind: 'archive' as const, policy: 'product.archive', tone: 'danger' as const, confirm: true, icon: 'archive' }]
  const runBulk = () => {
    let done = 0
    setState({ phase: 'executing', action: 'publish', done, total: selected })
    const t = setInterval(() => {
      done += 3
      if (done >= selected) { clearInterval(t); setState(selected > 10 ? { phase: 'error', action: 'publish', succeeded: selected - 2, failed: [{ label: 'Jua Gold Cooking Oil 3 L', reason: 'Seller not approved for this category' }, { label: 'Maziwa Milk Powder 400 g', reason: 'Missing required attribute: fat content' }] } : { phase: 'complete', action: 'publish', succeeded: selected }) }
      else setState({ phase: 'executing', action: 'publish', done, total: selected })
    }, 300)
  }
  return (
    <Plates cols={1}>
      <Plate label="Active, executing, partial failure"><BulkActions selected={selected} max={limits.maxBulk} noun={{ one: 'product', other: 'products' }} actions={actions} state={state} onRun={runBulk} onClear={() => { setState({ phase: 'idle' }); setSelected(12) }} impact={() => '3 of these products have open orders; buyers keep the price they ordered at.'} /></Plate>
      <Plate label="Over the contract limit" note={`limits.maxBulk = ${limits.maxBulk}`}><BulkActions selected={limits.maxBulk + 18} max={limits.maxBulk} noun={{ one: 'product', other: 'products' }} actions={actions} state={{ phase: 'idle' }} onRun={() => undefined} onClear={() => undefined} /></Plate>
      <Plate label="Complete"><BulkActions selected={6} max={limits.maxBulk} noun={{ one: 'product', other: 'products' }} actions={actions} state={{ phase: 'complete', action: 'publish', succeeded: 6 }} onRun={() => undefined} onClear={() => undefined} /></Plate>
    </Plates>
  )
}

function ConfirmSpecimen() {
  const archive = productMeta.actions!.find(a => a.name === 'archive')!
  const cancel = orderMeta.actions!.find(a => a.name === 'cancel')!
  return (
    <Plates cols={3}>
      <Plate label="Destructive · confirm only"><ConfirmAction action={archive} meta={productMeta} record={product} trigger={<Button variant="danger-outline">Archive product</Button>} onConfirm={() => new Promise(r => setTimeout(r, 900))} /></Plate>
      <Plate label="Command input"><ConfirmAction action={cancel} meta={orderMeta} record={order} trigger={<Button variant="danger-outline">Cancel order</Button>} onConfirm={() => new Promise(r => setTimeout(r, 900))} /></Plate>
      <Plate label="Server error kept in the dialog"><ConfirmAction action={cancel} meta={orderMeta} record={order} trigger={<Button variant="secondary">Cancel (fails)</Button>} onConfirm={() => Promise.reject({ code: 'CONFLICT', detail: 'The order was confirmed by Faith Chebet a moment ago; cancel it from the order page instead.', fields: {}, retryable: false })} /></Plate>
    </Plates>
  )
}

function StatusSpecimen() {
  const f = orderMeta.fields.find(x => x.name === 'status')!
  return (
    <Plates cols={2}>
      <Plate label="Every order status · stamp"><div className="flex flex-wrap gap-2">{f.choices!.map(c => <StatusBadge key={c.value} field={f} value={c.value} />)}</div></Plate>
      <Plate label="Dot presentation"><div className="flex flex-col gap-1.5">{f.choices!.slice(0, 5).map(c => <StatusBadge key={c.value} field={f} value={c.value} presentation="dot" />)}</div></Plate>
      <Plate label="Unknown value from a newer contract"><StatusBadge field={f} value="on_hold" /></Plate>
      <Plate label="Fresh (STAMP motion)"><StatusBadge field={f} value="delivered" fresh /></Plate>
    </Plates>
  )
}

export const navItems: NavItem[] = [
  { key: 'home', label: 'Overview', href: '#', icon: LayoutDashboard, group: 'Sell' },
  { key: 'products', label: 'Products', href: '#', icon: Package, count: 312, group: 'Sell' },
  { key: 'inventory', label: 'Inventory', href: '#', icon: Boxes, group: 'Sell' },
  { key: 'prices', label: 'Price books', href: '#', icon: Scale, group: 'Sell' },
  { key: 'orders', label: 'Orders', href: '#', icon: ShoppingCart, count: 7, group: 'Fulfil' },
  { key: 'fulfilment', label: 'Pick and pack', href: '#', icon: ClipboardList, group: 'Fulfil' },
  { key: 'deliveries', label: 'Deliveries', href: '#', icon: Truck, group: 'Fulfil' },
  { key: 'quotes', label: 'Quotes', href: '#', icon: ReceiptText, count: 2, group: 'Fulfil' },
  { key: 'members', label: 'Members', href: '#', icon: Users, group: 'Organization' },
  { key: 'settings', label: 'Settings', href: '#', icon: Settings, group: 'Organization' },
]

function Nav() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <Plates cols={2}>
      <Plate label="Expanded, grouped, seller manager"><div className="w-64 rounded-md border border-border bg-surface"><AppNav items={navItems} current="orders" brand={<BrandLogo variant="lockup" width={160} className="-m-2" />} context={<><b className="font-semibold">Mwangaza Wholesalers</b><span className="block text-muted">Seller manager</span></>} /></div></Plate>
      <Plate label="Collapsed · toggle">
        <div className={collapsed ? 'w-16 rounded-md border border-border bg-surface' : 'w-64 rounded-md border border-border bg-surface'}><AppNav items={navItems.slice(0, 6)} current="products" collapsed={collapsed} onCollapsedChange={setCollapsed} brand={<span className="font-display font-bold">SokoMesh</span>} /></div>
      </Plate>
      <Plate label="Mobile sheet · buyer purchaser (policy-filtered)"><MobileNav items={[{ key: 'shop', label: 'Shop', href: '#', icon: Package }, { key: 'cart', label: 'Cart', href: '#', icon: ShoppingCart, count: 3 }, { key: 'orders', label: 'Orders', href: '#', icon: ReceiptText }]} current="cart" grouped={false} brand="SokoMesh" /></Plate>
    </Plates>
  )
}

function Crumbs() {
  const items = [{ label: 'Catalogue', href: '#' }, { label: 'Flour & grains', href: '#' }, { label: 'Maize flour', href: '#' }, { label: 'Mavuno Maize Flour 2 kg' }]
  return (
    <Plates cols={1}>
      <Plate label="Full"><Breadcrumbs items={items} /></Plate>
      <Plate label="Collapsed middle"><Breadcrumbs items={items} variant="collapsed" /></Plate>
      <Plate label="Compact back link"><Breadcrumbs items={items} variant="compact" /></Plate>
    </Plates>
  )
}

function Palette() {
  const toast = useToast()
  const entries = [
    ...navItems.map(n => ({ id: n.key, label: n.label, group: 'Go to', icon: n.icon, onSelect: () => toast({ tone: 'info', title: `Go to ${n.label}` }) })),
    { id: 'add-product', label: 'Add product', group: 'Actions', icon: Plus, hint: 'product.create', onSelect: () => toast({ tone: 'info', title: 'Add product' }) },
    { id: 'create-quote', label: 'Respond to quote SM-QT-000318', group: 'Actions', icon: ReceiptText, onSelect: () => toast({ tone: 'info', title: 'Open quote' }) },
  ]
  return <Plates cols={1}><Plate label="Ctrl K anywhere on this specimen's page" note="Trigger as a field or an icon"><div className="flex flex-wrap items-center gap-3 on-chrome rounded-md bg-chrome p-3"><CommandPalette entries={entries} triggerLabel="Search Mwangaza" /><CommandPalette entries={entries} trigger="icon" triggerLabel="Open search" /></div></Plate></Plates>
}

function Empties() {
  return (
    <Plates cols={2}>
      <Plate label="no-data · permitted CTA"><EmptyState kind="no-data" title="No products yet" description="Products you publish appear here and in buyer search." action={<Button variant="primary" leadingIcon={Plus}>Add product</Button>} /></Plate>
      <Plate label="no-results"><EmptyState kind="no-results" title="No products match these filters" description="Remove the 25 kg pack filter or widen the price range." action={<Button variant="secondary">Clear filters</Button>} /></Plate>
      <Plate label="no-related · inline"><EmptyState kind="no-related" title="No other variants" size="inline" /></Plate>
      <Plate label="no-config"><EmptyState kind="no-config" title="No approval policy yet" description="Orders go straight to sellers until a buyer owner sets a threshold." /></Plate>
    </Plates>
  )
}

function Errors() {
  return (
    <Plates cols={2}>
      <Plate label="retryable (UNAVAILABLE)"><ErrorState code="UNAVAILABLE" onRetry={() => undefined} /></Plate>
      <Plate label="non-retryable (VALIDATION)"><ErrorState code="VALIDATION" detail="The quote expired at 17:00 yesterday; request a new one." /></Plate>
      <Plate label="conflict"><ErrorState code="CONFLICT" onCompare={() => undefined} /></Plate>
      <Plate label="permission"><ErrorState code="FORBIDDEN" detail="Only buyer owners can approve orders over KES 250,000.00." /></Plate>
      <Plate label="rate-limit · countdown"><ErrorState code="RATE_LIMITED" retryAfterSeconds={20} onRetry={() => undefined} /></Plate>
      <Plate label="offline"><ErrorState kind="offline" onRetry={() => undefined} /></Plate>
    </Plates>
  )
}

function Loading() {
  return (
    <Plates cols={2}>
      <Plate label="list"><LoadingState variant="skeleton" shape="list" rows={3} /></Plate>
      <Plate label="cards"><LoadingState variant="skeleton" shape="cards" rows={4} /></Plate>
      <Plate label="detail"><LoadingState variant="skeleton" shape="detail" rows={4} /></Plate>
      <Plate label="stat"><LoadingState variant="skeleton" shape="stat" /></Plate>
      <Plate label="inline"><LoadingState variant="inline" label="Checking stock with Mwangaza Wholesalers…" /></Plate>
      <Plate label="progress"><LoadingState variant="progress" label="Importing price book" value={312} max={480} detail="312 of 480 rows" /></Plate>
    </Plates>
  )
}

function Toasts() {
  const toast = useToast()
  return (
    <Plates cols={1}>
      <Plate label="From contract errors and action labels">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => toast(toastForAction({ label: 'Order confirmed' }, 'SM-ORD-004215', 'Wanjiru General Stores has been told.'))}>toastForAction</Button>
          <Button variant="secondary" onClick={() => toast(toastForError({ code: 'UNAVAILABLE', detail: 'SellaPay did not answer.', fields: {}, retryable: true }, () => undefined))}>Retryable error</Button>
          <Button variant="secondary" onClick={() => toast(toastForError({ code: 'CONFLICT', detail: 'The price changed while you were editing.', fields: {}, retryable: false }))}>Conflict</Button>
          <Button variant="secondary" onClick={() => toast(toastForError({ code: 'FORBIDDEN', detail: '', fields: {}, retryable: false }))}>Permission</Button>
        </div>
      </Plate>
      <Plate label="Tone and action variants" note="Errors and actionable toasts stay until dismissed">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => toast({ tone: 'info', title: 'Quote SM-QT-000318 has a reply', description: 'Mwangaza Wholesalers offered KES 1,690.00 per bale.', action: { label: 'View quote', altText: 'View quote SM-QT-000318', onAction: () => undefined }, persistent: true })}>Info with action</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'warning', title: 'Sugar repriced in your cart', description: 'Sukari Bora Sugar 1 kg is now KES 4,087.00 per bale (+3.2%).' })}>Warning, no action</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'success', title: 'Saved', description: 'Price book updated.' })}>Success, no action</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'danger', title: 'Publish failed', description: 'Missing required attribute: fat content.', persistent: true })}>Danger, no retry</Button>
        </div>
      </Plate>
    </Plates>
  )
}

const listPage: BlockSpec[] = [
  { block: 'header', props: { source: 'meta', meta: orderMeta, count: orders.length, variant: 'compact' } },
  { block: 'list', props: { meta: orderMeta, records: orders.slice(0, 3), density: 'compact', hasMore: true } },
]

function PageBlocksSpecimen() {
  return (
    <Plates cols={1}>
      <Plate label="listPage definition (data)"><pre className="overflow-x-auto rounded-sm bg-sunken p-3 font-mono text-sm">{`[{ block: 'header', props: { source: 'meta' } },\n { block: 'list' }]`}</pre></Plate>
      <Plate label="Rendered" tone="canvas"><PageBlocks page={listPage} ctx={{ now: DEMO_NOW }} /></Plate>
      <Plate label="Unknown block" note="Caught by the contract test before release">
        <p className="text-md">A page definition naming an unregistered block throws during render:</p>
        <p className="mt-2 font-mono text-sm text-tone-danger">{'callStage' in kernelBlocks ? '' : 'Unknown block "callStage": register it before using it in a page definition'}</p>
      </Plate>
    </Plates>
  )
}

function Pages() {
  const noun = { one: 'product', other: 'products' }
  return (
    <Plates cols={1}>
      <Plate label="first page" note="Previous unavailable"><Pagination from={1} to={24} total={1284} noun={noun} nextHref="?cursor=eyJpZCI6MjR9" /></Plate>
      <Plate label="middle page"><Pagination from={49} to={72} total={1284} noun={noun} prevHref="?cursor=eyJpZCI6MjR9" nextHref="?cursor=eyJpZCI6NzJ9" /></Plate>
      <Plate label="last page" note="Next unavailable"><Pagination from={1273} to={1284} total={1284} noun={noun} prevHref="?cursor=eyJpZCI6MTI0OH0" /></Plate>
      <Plate label="total not counted" note="Large searches skip the count"><Pagination from={25} to={48} noun={noun} prevHref="?cursor=a" nextHref="?cursor=b" /></Plate>
    </Plates>
  )
}

const map: Record<string, () => ReactNode> = {
  'K-01': Recipes, 'K-02': ProjectionSpecimen, 'K-03': Dispatchers, 'K-04': Forms, 'K-05': ActionBarSpecimen, 'K-06': ActionMenuSpecimen,
  'K-07': BulkSpecimen, 'K-08': ConfirmSpecimen, 'K-09': StatusSpecimen, 'K-10': Nav, 'K-11': Crumbs, 'K-12': Palette, 'K-13': Empties,
  'K-14': Errors, 'K-15': Loading, 'K-16': Toasts, 'K-17': PageBlocksSpecimen, 'K-18': Pages,
}

export default function KernelSpecimens({ code }: { code: string }) {
  const S = map[code]
  return S ? <S /> : null
}

