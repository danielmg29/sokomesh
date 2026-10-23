'use client'

// SM-F-04, sellers: their catalogue. A product is created from a name and a category; its category details
// are generated from that category's published contract (SM-F-03); what buyers order are its variants.
// Every rule (attribute values, units the category is sold by, SKUs, minimum orders, who may publish) is
// the API's; these pages mirror a few for quick feedback and show the API's own messages in place.
// Photographs (SM-F-05) go through the media pipeline; the price book (SM-F-06) lists every rule that
// competes for a product, and the API decides which one a buyer pays.

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CategoryDetailsForm, MediaManager, ProductEditorBlock, VariantMatrixEditor, type DetailsOutcome, type MediaItem, type ProductStatus, type VariantErrors, type VariantRow } from '@/components/commerce/catalog'
import { PriceBookEditor, type PriceRule } from '@/components/commerce/pricing'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { BulkActions } from '@/components/kernel/actions/BulkActions'
import { ConfirmAction } from '@/components/kernel/actions/ConfirmAction'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { unitLabel } from '@/components/kernel/fields/types'
import { ProjectedForm } from '@/components/kernel/forms/ProjectedForm'
import { PageSection } from '@/components/layout/section'
import { Button, buttonStyles } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ApiError, api, attempt } from '@/lib/client/api'
import type { CatalogProductRecord, CategoryContractRecord, MediaAssetRecord } from '@/lib/client/records'
import { useBulkCommand, useCommand, useList, useRecord, useRefresh, useSave, useSource } from '@/lib/client/resources'
import { may, useSession } from '@/lib/client/session'
import { CatalogProductMeta, CategoryContractMeta, MediaAssetMeta, PriceRuleMeta, VariantMeta, limits, uploads } from '@/lib/contract/generated'
import type { ActionMeta, AppError, Rec } from '@/lib/contract/types'
import { formatMoney } from '@/lib/money'

const CREATE_FIELDS = ['name', 'category_contract', 'brand', 'short_description'] as const
const EDIT_FIELDS = ['name', 'brand', 'short_description', 'description', 'slug', 'available_from', 'available_until', 'seo_title', 'seo_description'] as const
const failed: AppError = { code: 'UNAVAILABLE', detail: 'It was not saved. Try again in a moment.', fields: {}, retryable: true }
const errorOf = (err: unknown): AppError => (err instanceof ApiError ? err.error : failed)

// Commands that need no input can run over a selection (publish, take off sale, archive, restore).
const BULK = (CatalogProductMeta.actions as readonly ActionMeta[]).filter(a => !a.input?.length)

export function SellerProducts() {
  const source = useSource(CatalogProductMeta)
  const command = useCommand(CatalogProductMeta)
  const bulk = useBulkCommand(CatalogProductMeta)
  const { data: session } = useSession()
  const [chosen, setChosen] = useState<Map<string, Rec>>(new Map())
  const select = (ids: string[], rows: Rec[]) => setChosen(prev => new Map(ids.map(id => [id, rows.find(r => r.id === id) ?? prev.get(id)!] as const).filter(([, r]) => r)))
  const rows = [...chosen.values()]
  // Offer what at least one selected product allows; the others are reported as not changed.
  const offered = BULK.filter(a => rows.some(r => (r._can ?? []).includes(a.name)))
  const clear = () => { setChosen(new Map()); bulk.reset() }
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={CatalogProductMeta} title="Products"
        description="Everything you sell, drafts included. Filter by status or category; open a product to edit its details, packs and prices."
        actions={may(session, 'catalog_product.create') ? <Link href={'/sell/products/new' as Route} className={buttonStyles({ variant: 'primary' })}>New product</Link> : null} />
      <BulkActions selected={chosen.size} max={limits.maxBulk} noun={{ one: 'product', other: 'products' }} actions={offered} state={bulk.progress}
        onRun={a => void bulk.run(a, rows)} onClear={clear}
        impact={a => `${rows.filter(r => (r._can ?? []).includes(a.name)).length} of ${rows.length} selected can be changed now; the rest stay as they are.`} />
      <ListBlock meta={CatalogProductMeta} records={[]} query="server" source={source} onRun={command.run} href={r => `/sell/products/${r.id}`}
        selectable selected={[...chosen.keys()]} onSelectedChange={select}
        empty={{ kind: 'no-data', title: 'No products yet', description: 'Create your first product: a name and a category are enough to start a draft.' }} />
    </>
  )
}

/** Published contracts as category choices (the API accepts only published versions). */
function useCategoryChoices() {
  const list = useList<CategoryContractRecord>(CategoryContractMeta, 'status__in=published&page_size=50&ordering=name')
  return (list.data?.results ?? []).map(c => ({ value: c.id, label: c.name, description: `Contract version ${c.version}` }))
}

export function NewProduct() {
  const router = useRouter()
  const choices = useCategoryChoices()
  const save = useSave<CatalogProductRecord>(CatalogProductMeta)
  return (
    <>
      <HeaderBlock level={1} source="explicit" title="New product" breadcrumbs={[{ label: 'Products', href: '/sell/products' }, { label: 'New product' }]}
        description="Name it and choose its category. Next you fill in the category's details and add the packs you sell; it stays a draft until you publish it." />
      <ProductEditorBlock meta={CatalogProductMeta} mode="create" status="draft" category="" fields={CREATE_FIELDS} options={{ category_contract: choices }}
        onSubmit={async values => {
          try {
            const made = await save.mutateAsync({ body: values })
            router.push(`/sell/products/${made.id}` as Route)
            return { ok: true, message: 'Draft created' }
          } catch (err) {
            return { ok: false, error: errorOf(err) }
          }
        }} />
    </>
  )
}

const rowOf = (v: CatalogProductRecord['variants'][number]): VariantRow => ({
  id: v.id, sku: v.sku, attributes: v.attributes, packagingUnit: v.packaging_unit, unitsPerPack: v.units_per_pack, moq: String(v.moq),
  price: v.unit_price, stock: v.stock.available === null ? '' : String(v.stock.available), active: v.is_active, packLabel: v.pack_label,
})

const bodyOf = (r: VariantRow, product: string) => ({
  ...(r.isNew ? { product, sku: r.sku.trim() } : {}),
  attributes: r.attributes, packaging_unit: r.packagingUnit, units_per_pack: r.unitsPerPack, minimum_order_quantity: Number(r.moq),
  unit_price: r.price, is_active: r.active,
})

export function ProductEditor({ id }: { id: string }) {
  const record = useRecord<CatalogProductRecord>(CatalogProductMeta, id)
  const command = useCommand(CatalogProductMeta, [VariantMeta])
  const save = useSave(CatalogProductMeta)
  const refresh = useRefresh()
  const [savingDetails, setSavingDetails] = useState(false)
  const [savingVariants, setSavingVariants] = useState(false)
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the product" />
  if (record.isError || !record.data) return <ErrorState {...errorFrom(record.error)} title="The product did not load" onRetry={() => void record.refetch()} />
  const p = record.data
  // A newer published version is what the next save checks against, so its fields are the ones to fill.
  const contract = p.newer_contract ?? p.contract
  const editable = p.status !== 'archived'
  const saveDetails = async (values: Record<string, unknown>): Promise<DetailsOutcome> => {
    setSavingDetails(true)
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== undefined && v !== ''))
    const out = await attempt(() => save.mutateAsync({ ref: p.id, body: { attributes: clean } }))
    setSavingDetails(false)
    return out.ok ? { ok: true } : { ok: false, detail: out.error.detail, fields: out.error.fields }
  }
  const saveVariants = async (rows: VariantRow[]): Promise<VariantErrors> => {
    setSavingVariants(true)
    const errors: VariantErrors = {}
    for (const r of rows) { // one at a time: each row's answer is its own, and the list stays small (bounded per product)
      try {
        await api(r.isNew ? VariantMeta.path! : `${VariantMeta.path}/${r.id}`, { method: r.isNew ? 'POST' : 'PATCH', body: bodyOf(r, p.id) })
      } catch (err) {
        const e = errorOf(err)
        errors[r.id] = Object.keys(e.fields).length ? Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? e.detail])) : { row: e.detail }
      }
    }
    await refresh(CatalogProductMeta.path!, VariantMeta.path!)
    setSavingVariants(false)
    return errors
  }
  return (
    <>
      <HeaderBlock level={1} source="record" meta={CatalogProductMeta} record={p} breadcrumbs={[{ label: 'Products', href: '/sell/products' }, { label: p.name }]}
        description={p.public_url ? 'On sale in the catalogue. Changes show to buyers as soon as they are saved.' : 'Buyers cannot see this product until it is published.'}
        actions={<>
          {p.public_url ? <Link href={p.public_url as Route} className={buttonStyles({ variant: 'secondary' })}>View in the catalogue</Link> : null}
          <ActionBar meta={CatalogProductMeta} record={p} onRun={command.run} pending={command.pending} inline={2} />
        </>} />
      {p.newer_contract ? (
        <p role="status" className="border-l-[length:var(--border-stamp)] border-tone-info bg-tone-info-bg/50 px-4 py-3 text-md">
          {p.category.label} has a newer contract (version {p.newer_contract.version}). The details below follow it; saving moves this product onto it.
        </p>
      ) : null}
      <ProductEditorBlock key={p.updated_at as string} meta={CatalogProductMeta} mode="edit" status={p.status as ProductStatus} category={`${p.category.label} (version ${contract.version})`}
        fields={EDIT_FIELDS} initial={p} publishBlockers={p.publish_blockers}
        onSubmit={values => attempt(() => save.mutateAsync({ ref: p.id, body: values }), 'Saved')}>
        <CategoryDetailsForm key={`${contract.id}-${p.updated_at as string}`} fields={contract.attributes} values={p.attributes} guidance={contract.seller_guidance}
          onSave={editable ? saveDetails : undefined} saving={savingDetails} />
      </ProductEditorBlock>
      <PageSection title="Packs and prices" description={`What buyers order. ${p.category.label} is sold by the ${contract.sale_units.map(u => u.label.toLowerCase()).join(', ')}; prices are per pack in KES. Stock is received and counted on the Stock page.`}>
        <VariantMatrixEditor key={p.variants.map(v => `${v.id}:${v.unit_price}:${v.moq}:${v.is_active}:${v.stock.available}`).join('|')}
          attributes={contract.variant_attributes.map(f => ({ key: f.name, label: f.label ?? f.name, options: f.choices ?? [] }))}
          units={contract.sale_units} rows={p.variants.map(rowOf)} onSave={editable ? saveVariants : undefined} saving={savingVariants} />
      </PageSection>
      <ProductMedia product={p} />
      <ProductPrices product={p} />
    </>
  )
}

// --- SM-F-05 photographs and SM-F-06 price book, on the product editor ---------------------------------

const POLL_MS = 3000
const POLL_LIMIT = 40 // two minutes; the worker command takes over anything slower

const mediaItem = (m: MediaAssetRecord): MediaItem => ({
  id: m.id, name: m.name, url: m.url ?? undefined, alt: m.alt_text, size: m.size, width: m.width ?? undefined, height: m.height ?? undefined,
  state: m.processing_status === 'ready' ? 'ready' : m.scan_status === 'rejected' || m.processing_status === 'failed' ? 'rejected' : 'processing',
  reason: m.rejection_reason ?? undefined,
})

function ProductMedia({ product }: { product: CatalogProductRecord }) {
  const client = useQueryClient()
  const refresh = useRefresh()
  const toast = useToast()
  const save = useSave(MediaAssetMeta, [CatalogProductMeta])
  const command = useCommand(MediaAssetMeta, [CatalogProductMeta])
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<MediaAssetRecord | null>(null)
  const waiting = product.media.some(m => m.processing_status === 'queued' || m.processing_status === 'processing')
  // While photographs are being checked, look again every few seconds (bounded; stops when none wait).
  useEffect(() => {
    if (!waiting) return
    let polls = 0
    const timer = setInterval(() => { polls += 1; if (polls > POLL_LIMIT) clearInterval(timer); else void client.invalidateQueries({ queryKey: [CatalogProductMeta.path] }) }, POLL_MS)
    return () => clearInterval(timer)
  }, [waiting, client])
  const upload = async (files: File[]) => {
    setBusy(true)
    for (const file of files) { // one at a time: each answer is its own, and a product holds at most twelve
      const form = new FormData()
      form.set('file', file)
      try {
        await api(`catalog/products/${product.id}/media`, { method: 'POST', body: form })
      } catch (err) {
        const e = err instanceof ApiError ? err.error : null
        toast({ tone: 'danger', title: `${file.name} was not added`, description: e?.fields?.file?.[0] ?? e?.detail ?? 'Try again in a moment.', persistent: true })
      }
    }
    await refresh(CatalogProductMeta.path!, MediaAssetMeta.path!)
    setBusy(false)
  }
  const fail = (title: string) => (err: unknown) => toast({ tone: 'danger', title, description: err instanceof ApiError ? err.error.detail : 'Try again in a moment.', persistent: true })
  const move = (id: string, to: number) => {
    const order = product.media.filter(m => m.id !== id)
    order.splice(to, 0, product.media.find(m => m.id === id)!)
    // Renumber only what changed: a product holds at most twelve photographs.
    void Promise.all(order.map((m, i) => (m.sort_order === i ? null : save.mutateAsync({ ref: m.id, body: { sort_order: i } })))).catch(fail('Order not saved'))
  }
  const remove = MediaAssetMeta.actions.find(a => a.name === 'remove') as ActionMeta
  return (
    // The media manager and the price book carry their own headings, under one rule each.
    <section className="border-t border-border pt-8" aria-label="Photographs">
      <MediaManager key={product.media.map(m => `${m.id}:${m.processing_status}:${m.sort_order}:${m.alt_text}`).join('|')} items={product.media.map(mediaItem)}
        maxBytes={uploads.productImage.maxBytes} accept={uploads.productImage.types} busy={busy} onUpload={files => void upload(files)}
        onAlt={(id, alt) => void save.mutateAsync({ ref: id, body: { alt_text: alt } }).catch(fail('Alt text not saved'))} onMove={move}
        onRemove={id => setRemoving(product.media.find(m => m.id === id) ?? null)} />
      {removing && (removing._can ?? []).includes('remove') ? (
        <ConfirmAction action={remove} meta={MediaAssetMeta} record={{ ...removing, original_name: removing.name }} open onOpenChange={o => { if (!o) setRemoving(null) }}
          onConfirm={() => command.run(remove, removing)} />
      ) : null}
    </section>
  )
}

function ProductPrices({ product }: { product: CatalogProductRecord }) {
  const save = useSave(PriceRuleMeta, [CatalogProductMeta])
  const command = useCommand(PriceRuleMeta, [CatalogProductMeta])
  const toast = useToast()
  const [saving, setSaving] = useState<string | null>(null)
  const variants = new Map(product.variants.map(v => [v.id, v]))
  const unit = product.variants[0]?.packaging_unit ?? 'pack'
  const rules: PriceRule[] = [
    ...product.variants.map((v): PriceRule => ({ id: `list:${v.id}`, scope: 'base', label: 'List price', detail: `${v.pack_label} · SKU ${v.sku} · change it with the pack`, unitPrice: v.unit_price, state: 'active', priority: 0, locked: true })),
    ...product.price_rules.map((r): PriceRule => {
      const v = variants.get(r.variant)
      return {
        id: r.id,
        scope: r.buyer_group_key ? 'buyer-group' : v && r.minimum_quantity > v.moq ? 'quantity-tier' : 'base',
        label: r.label || r.explanation,
        detail: `${v ? `SKU ${v.sku} · ` : ''}from ${r.minimum_quantity} ${unitLabel(r.unit, r.minimum_quantity) ?? r.unit}`,
        buyerGroup: r.buyer_group_key ? `Group ${r.buyer_group_key}` : undefined,
        unitPrice: r.unit_price, effectiveFrom: r.effective_from, effectiveTo: r.effective_until ?? undefined, state: r.state, priority: r.priority, conflictNote: r.conflict_note ?? undefined,
      }
    }),
  ]
  const records = new Map(product.price_rules.map(r => [r.id, r]))
  const canCreate = product.variants.length > 0
  const add = canCreate ? (
    <ProjectedForm meta={PriceRuleMeta} fields={['variant', 'label', 'buyer_group_key', 'minimum_quantity', 'unit_price', 'priority', 'effective_from', 'effective_until']} mode="create" recipe="sheet"
      submitLabel="Add the rule" title="New price rule" description="A quantity tier, a price for one buyer group, or a dated promotion. Buyers see the rule's reason next to the price."
      options={{ variant: product.variants.map(v => ({ value: v.id, label: `${v.pack_label} · ${v.sku}`, description: `List ${formatMoney(v.unit_price)}, minimum ${v.moq}` })) }}
      initial={{ variant: product.variants[0] ? { id: product.variants[0].id, label: `${product.variants[0].pack_label} · ${product.variants[0].sku}` } : null, effective_from: new Date().toISOString() }}
      trigger={<Button size="sm" variant="primary" leadingIcon={Plus}>Add a rule</Button>}
      onSubmit={values => attempt(() => save.mutateAsync({ body: values }), 'Rule added')} />
  ) : null
  const onSave = (id: string, unitPrice: string) => {
    setSaving(id)
    save.mutateAsync({ ref: id, body: { unit_price: unitPrice } })
      .then(() => toast({ tone: 'success', title: 'Price saved', description: 'Buyers see it from their next look at the product.' }))
      .catch(err => toast({ tone: 'danger', title: 'Price not saved', description: err instanceof ApiError ? Object.values(err.error.fields).flat()[0] ?? err.error.detail : 'Try again in a moment.', persistent: true }))
      .finally(() => setSaving(null))
  }
  return (
    <section className="border-t border-border pt-8" aria-label="Price book">
      <PriceBookEditor rules={rules} unit={unit} product={product.name} toolbar={add} onSave={onSave} saving={saving}
        ruleActions={r => (records.get(r.id) ? <ActionBar meta={PriceRuleMeta} record={records.get(r.id)!} onRun={command.run} pending={command.pending} density="compact" /> : null)} />
    </section>
  )
}
