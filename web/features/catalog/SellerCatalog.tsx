'use client'

// SM-F-04, sellers: their catalogue. A product is created from a name and a category; its category details
// are generated from that category's published contract (SM-F-03); what buyers order are its variants.
// Every rule (attribute values, units the category is sold by, SKUs, minimum orders, who may publish) is
// the API's; these pages mirror a few for quick feedback and show the API's own messages in place.

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CategoryDetailsForm, ProductEditorBlock, VariantMatrixEditor, type DetailsOutcome, type ProductStatus, type VariantErrors, type VariantRow } from '@/components/commerce/catalog'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { PageSection } from '@/components/layout/section'
import { buttonStyles } from '@/components/ui/button'
import { ApiError, api, attempt } from '@/lib/client/api'
import type { CatalogProductRecord, CategoryContractRecord } from '@/lib/client/records'
import { useCommand, useList, useRecord, useRefresh, useSave, useSource } from '@/lib/client/resources'
import { may, useSession } from '@/lib/client/session'
import { CatalogProductMeta, CategoryContractMeta, VariantMeta } from '@/lib/contract/generated'
import type { AppError } from '@/lib/contract/types'

const CREATE_FIELDS = ['name', 'category_contract', 'brand', 'short_description'] as const
const EDIT_FIELDS = ['name', 'brand', 'short_description', 'description', 'slug', 'available_from', 'available_until', 'seo_title', 'seo_description'] as const
const failed: AppError = { code: 'UNAVAILABLE', detail: 'It was not saved. Try again in a moment.', fields: {}, retryable: true }
const errorOf = (err: unknown): AppError => (err instanceof ApiError ? err.error : failed)

export function SellerProducts() {
  const source = useSource(CatalogProductMeta)
  const command = useCommand(CatalogProductMeta)
  const { data: session } = useSession()
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={CatalogProductMeta} title="Products"
        description="Everything you sell, drafts included. Filter by status or category; open a product to edit its details, packs and prices."
        actions={may(session, 'catalog_product.create') ? <Link href={'/sell/products/new' as Route} className={buttonStyles({ variant: 'primary' })}>New product</Link> : null} />
      <ListBlock meta={CatalogProductMeta} records={[]} query="server" source={source} onRun={command.run} href={r => `/sell/products/${r.id}`}
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
  unit_price: r.price, stock_on_hand: r.stock ? Number(r.stock) : null, is_active: r.active,
})

export function ProductEditor({ id }: { id: string }) {
  const record = useRecord<CatalogProductRecord>(CatalogProductMeta, id)
  const command = useCommand(CatalogProductMeta, [VariantMeta])
  const save = useSave(CatalogProductMeta)
  const refresh = useRefresh()
  const [savingDetails, setSavingDetails] = useState(false)
  const [savingVariants, setSavingVariants] = useState(false)
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the product" />
  if (record.isError || !record.data) return <ErrorState kind="retryable" title="The product did not load" onRetry={() => void record.refetch()} />
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
      <PageSection title="Packs and prices" description={`What buyers order. ${p.category.label} is sold by the ${contract.sale_units.map(u => u.label.toLowerCase()).join(', ')}; prices are per pack in KES.`}>
        <VariantMatrixEditor key={p.variants.map(v => `${v.id}:${v.unit_price}:${v.moq}:${v.is_active}:${v.stock.available}`).join('|')}
          attributes={contract.variant_attributes.map(f => ({ key: f.name, label: f.label ?? f.name, options: f.choices ?? [] }))}
          units={contract.sale_units} rows={p.variants.map(rowOf)} onSave={editable ? saveVariants : undefined} saving={savingVariants} />
      </PageSection>
    </>
  )
}
