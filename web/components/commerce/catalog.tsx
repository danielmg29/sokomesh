'use client'

import { ArrowDown, ArrowUp, Copy, ImagePlus, LayoutGrid, Rows3 } from 'lucide-react'
import Image from 'next/image'
import { useState, type ReactNode } from 'react'
import { FiltersBlock, type FilterValues } from '@/components/kernel/blocks/FiltersBlock'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import { FileView } from '@/components/kernel/fields/views'
import { asStringList, formatBytes, type FileValue } from '@/components/kernel/fields/types'
import { ProjectedForm, type FormRecipe, type SubmitResult } from '@/components/kernel/forms/ProjectedForm'
import { Button, IconButton } from '@/components/ui/button'
import { Checkbox, Segmented } from '@/components/ui/choice'
import { Sheet } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Stamp } from '@/components/ui/stamp'
import { ScrollArea, TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { FacetChips, TablePager, TableSearch, TableToolbar } from '@/components/ui/table-controls'
import { Thread, type ThreadStep } from '@/components/ui/thread'
import { useTableQuery } from '@/lib/client/use-table-query'
import { cn } from '@/lib/cn'
import type { Accessors, FilterValue } from '@/lib/query'
import type { FieldMeta, ModelMeta, Tone } from '@/lib/contract/types'
import { formatDate } from '@/lib/format'

export type SellerStatus = 'draft' | 'under_review' | 'active' | 'rejected' | 'suspended'
const sellerLook: Record<SellerStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' }, under_review: { tone: 'info', label: 'Under review' }, active: { tone: 'success', label: 'Active' },
  rejected: { tone: 'danger', label: 'Rejected' }, suspended: { tone: 'warning', label: 'Suspended' },
}
export type SellerDocument = { type: string; file: FileValue; status: 'pending' | 'verified' | 'rejected' | 'expired'; expiresAt?: string; notes?: string }
const docLook: Record<SellerDocument['status'], { tone: Tone; label: string }> = {
  pending: { tone: 'info', label: 'Pending check' }, verified: { tone: 'success', label: 'Verified' }, rejected: { tone: 'danger', label: 'Rejected' }, expired: { tone: 'warning', label: 'Expired' },
}

// Mirrors SellerProfile.rejection_reason in the field specification (SM-F-02).
const rejectionField: FieldMeta = { name: 'rejection_reason', type: 'text', widget: 'textarea', label: 'Reason', required: true, maxLength: 1000, help: 'Sent to the seller; keep it specific and actionable.' }

/** Marketplace-admin seller review (SM-F-02): unapproved sellers cannot publish or receive orders. */
export function SellerOnboardingReviewBlock({ seller, location, status, documents, history }: {
  seller: string; location: string; status: SellerStatus; documents: readonly SellerDocument[]; history: readonly { status: SellerStatus; at: string; by: string }[]
}) {
  const [view, setView] = useState<'summary' | 'full'>('summary')
  const [decision, setDecision] = useState<'approve' | 'reject' | 'suspend' | null>(null)
  const [reason, setReason] = useState('')
  const verified = documents.filter(d => d.status === 'verified').length
  const steps: ThreadStep[] = history.map((h, i) => ({ key: `${h.status}-${i}`, label: sellerLook[h.status].label, detail: `${formatDate(h.at)} · ${h.by}`, state: h.status === 'rejected' ? 'failed' : i === history.length - 1 && h.status === 'under_review' ? 'current' : 'done' }))
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label={`Seller review: ${seller}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col"><h3 className="font-display text-xl font-bold">{seller}</h3><span className="text-sm text-muted">{location} · {verified} of {documents.length} documents verified</span></div>
        <Stamp tone={sellerLook[status].tone}>{sellerLook[status].label}</Stamp>
      </div>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-sans text-md font-semibold">Documents</h4>
        <Segmented label="Document view" size="sm" value={view} onValueChange={setView} items={[{ value: 'summary', label: 'Summary' }, { value: 'full', label: 'Full' }]} />
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
        {documents.map(d => (
          <li key={d.type} className="flex flex-col gap-1.5 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{d.type}</span><Stamp tone={docLook[d.status].tone} size="sm">{docLook[d.status].label}</Stamp></div>
            {view === 'full' ? (
              <>
                <FileView field={{ name: 'file', type: 'file', widget: 'file' }} value={d.file} />
                <span className="text-sm text-muted">{d.expiresAt ? `Expires ${formatDate(d.expiresAt)}` : 'No expiry'}{d.notes ? ` · ${d.notes}` : ''}</span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2"><h4 className="font-sans text-md font-semibold">Activation history</h4><Thread orientation="vertical" label="Seller activation history" steps={steps} /></div>
      {status === 'under_review' || status === 'active' ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {status === 'under_review' ? <Button variant="primary" onClick={() => setDecision('approve')} disabled={verified < documents.length}>Approve seller</Button> : null}
          {status === 'under_review' ? <Button variant="danger-outline" onClick={() => setDecision('reject')}>Reject</Button> : null}
          {status === 'active' ? <Button variant="warning-outline" onClick={() => setDecision('suspend')}>Suspend seller</Button> : null}
          {status === 'under_review' && verified < documents.length ? <p className="w-full text-sm text-muted">Approval unlocks once every document is verified.</p> : null}
        </div>
      ) : null}
      <Sheet open={decision !== null} onOpenChange={o => { if (!o) setDecision(null) }} title={decision === 'approve' ? `Approve ${seller}?` : decision === 'reject' ? `Reject ${seller}` : `Suspend ${seller}`}
        description={decision === 'approve' ? 'They can publish products and receive orders immediately.' : decision === 'suspend' ? 'Their products are hidden and open orders are flagged for review.' : 'The seller sees this reason and can resubmit.'}
        footer={<><Button variant="secondary" onClick={() => setDecision(null)}>Cancel</Button><Button variant={decision === 'approve' ? 'primary' : 'danger'} disabled={decision !== 'approve' && !reason.trim()} onClick={() => setDecision(null)}>{decision === 'approve' ? 'Approve seller' : decision === 'reject' ? 'Reject seller' : 'Suspend seller'}</Button></>}>
        {decision !== 'approve' ? <FieldInput field={rejectionField} value={reason} onChange={v => setReason(String(v ?? ''))} /> : <p className="text-md">All {documents.length} documents are verified.</p>}
      </Sheet>
    </section>
  )
}

export type ProductStatus = 'draft' | 'published' | 'suspended' | 'archived'
const productLook: Record<ProductStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' }, published: { tone: 'success', label: 'Published' }, suspended: { tone: 'warning', label: 'Suspended' }, archived: { tone: 'neutral', label: 'Archived' },
}

/** Configured ProjectedForm: category-generated attribute fields without category-specific pages (SM-F-04). */
export function ProductEditorBlock({ meta, mode, layout = 'inline', status, initial, publishBlockedReason, onSubmit, category }: {
  meta: ModelMeta; mode: 'create' | 'edit'; layout?: Extract<FormRecipe, 'inline' | 'stepper'>; status: ProductStatus; initial?: Record<string, unknown>
  publishBlockedReason?: string; onSubmit: (v: Record<string, unknown>) => Promise<SubmitResult>; category: string
}) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label={mode === 'create' ? 'New product' : 'Edit product'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col"><h3 className="font-display text-xl font-bold">{mode === 'create' ? 'New product' : String(initial?.name ?? 'Product')}</h3><span className="text-sm text-muted">Category: {category} · fields come from the category contract</span></div>
        <div className="flex items-center gap-2">
          <Stamp tone={productLook[status].tone}>{productLook[status].label}</Stamp>
          {status === 'draft' ? <Button variant="primary" size="sm" disabled={Boolean(publishBlockedReason)} title={publishBlockedReason}>Publish</Button> : null}
        </div>
      </div>
      {publishBlockedReason ? <p className="rounded-sm border border-tone-warning bg-tone-warning-bg/60 px-3 py-2 text-md">{publishBlockedReason}</p> : null}
      <ProjectedForm meta={meta} mode={mode} recipe={layout} initial={initial} onSubmit={onSubmit} submitLabel={mode === 'create' ? 'Save draft' : 'Save changes'} />
    </section>
  )
}

export type VariantRow = { id: string; sku: string; attributes: Record<string, string>; packagingUnit: string; unitsPerPack: string; moq: string; active: boolean }

/**
 * Variant creation from category attribute combinations; duplicates and invalid MOQs are flagged inline.
 * Search covers the SKU and attribute values; facets narrow by status, by what needs fixing and by each
 * category attribute. Filters apply live, so a row fixed while "To fix" is chosen leaves the view.
 */
export function VariantMatrixEditor({ attributes, rows: initialRows, layout: initialLayout = 'table' }: {
  attributes: readonly { key: string; label: string; options: readonly string[] }[]; rows: readonly VariantRow[]; layout?: 'table' | 'cards'
}) {
  const [rows, setRows] = useState(initialRows)
  const [layout, setLayout] = useState(initialLayout)
  const [bulk, setBulk] = useState(false)
  const [fill, setFill] = useState({ moq: '', packagingUnit: '' })
  const combo = (r: VariantRow) => attributes.map(a => r.attributes[a.key]).join(' · ')
  const dupes = new Set(rows.map(combo).filter((c, i, all) => all.indexOf(c) !== i))
  const problem = (r: VariantRow) => (dupes.has(combo(r)) ? 'Same attributes as another variant' : !/^\d+(\.\d+)?$/.test(r.moq) || Number(r.moq) < 1 ? 'Minimum order must be at least 1' : null)
  const update = (id: string, patch: Partial<VariantRow>) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
  const invalid = rows.filter(problem).length
  // Reads the current rows (the duplicate check depends on all of them), so the result follows every edit.
  const access: Accessors<VariantRow> = {
    text: r => [r.sku, r.packagingUnit, ...Object.values(r.attributes)],
    value: (r, key) => key === 'status' ? (r.active ? 'active' : 'inactive') : key === 'check' ? (problem(r) ? 'fix' : 'ok') : key.startsWith('attr:') ? r.attributes[key.slice(5)] : undefined,
  }
  const t = useTableQuery(rows, access, { pageSize: 10 })
  const facet = (key: string, label: string, options: readonly { value: string; label: string }[]) => {
    const counts = t.counts(key)
    return <FacetChips key={key} label={label} options={options.map(o => ({ ...o, count: counts[o.value] ?? 0 }))} value={asStringList(t.query.filters[key]?.value)}
      onChange={next => t.setFilter(key, next.length ? ({ op: 'in', value: next } satisfies FilterValue) : undefined)} />
  }
  const shown = t.result.rows
  return (
    <section className="flex flex-col gap-3" aria-label="Variants">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3"><h3 className="font-display text-lg font-bold">Variants</h3>{invalid ? <Stamp tone="danger" size="sm">{invalid} to fix</Stamp> : <Stamp tone="success" size="sm">All valid</Stamp>}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={bulk ? 'primary' : 'secondary'} leadingIcon={Copy} aria-pressed={bulk} onClick={() => setBulk(b => !b)}>Bulk fill</Button>
          <Segmented label="Layout" size="sm" value={layout} onValueChange={setLayout} items={[{ value: 'table', label: <span className="inline-flex items-center gap-1"><Rows3 className="size-3.5" aria-hidden />Table</span> }, { value: 'cards', label: <span className="inline-flex items-center gap-1"><LayoutGrid className="size-3.5" aria-hidden />Cards</span> }]} />
        </div>
      </div>
      {bulk ? (
        <div className="flex flex-wrap items-end gap-2 rounded-sm border border-signal-border bg-signal-soft p-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">Minimum order<Input value={fill.moq} onChange={e => setFill(f => ({ ...f, moq: e.target.value }))} inputMode="numeric" className="w-28" /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold">Packaging unit<Input value={fill.packagingUnit} onChange={e => setFill(f => ({ ...f, packagingUnit: e.target.value }))} className="w-36" /></label>
          <Button size="md" variant="primary" onClick={() => setRows(rs => rs.map(r => ({ ...r, ...(fill.moq ? { moq: fill.moq } : {}), ...(fill.packagingUnit ? { packagingUnit: fill.packagingUnit } : {}) })))}>Apply to all {rows.length}</Button>
        </div>
      ) : null}
      <TableToolbar active={t.active} onClear={t.clear}
        search={<TableSearch label="Search variants" placeholder="SKU or attribute…" value={t.query.q} onChange={t.setSearch} />}
        facets={<>
          {facet('status', 'Status', [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }])}
          {facet('check', 'Check', [{ value: 'fix', label: 'To fix' }, { value: 'ok', label: 'OK' }])}
          {attributes.map(a => facet(`attr:${a.key}`, a.label, a.options.map(o => ({ value: o, label: o }))))}
        </>} />
      {t.result.total === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState kind="no-results" title="No variants match" description="Try another SKU or remove a filter." action={<Button variant="secondary" onClick={t.clear}>Clear search and filters</Button>} />
        </div>
      ) : layout === 'table' ? (
        <div className="overflow-hidden rounded-md border border-border bg-surface" data-density="compact">
          <ScrollArea label="Variants table, scrolls sideways">
            <Table caption="Variants">
              <THead><tr><Th>Active</Th><Th>SKU</Th>{attributes.map(a => <Th key={a.key}>{a.label}</Th>)}<Th>Pack</Th><Th numeric>Units/pack</Th><Th numeric>MOQ</Th><Th>Check</Th></tr></THead>
              <TBody>
                {shown.map(r => {
                  const p = problem(r)
                  return (
                    <Tr key={r.id} className={cn(p && 'bg-tone-danger-bg/30')}>
                      <Td><Checkbox aria-label={`${r.sku} active`} checked={r.active} onCheckedChange={c => update(r.id, { active: c === true })} /></Td>
                      <Td><code className="font-mono text-sm">{r.sku}</code></Td>
                      {attributes.map(a => (
                        <Td key={a.key}>
                          <select aria-label={`${a.label} for ${r.sku}`} value={r.attributes[a.key]} onChange={e => update(r.id, { attributes: { ...r.attributes, [a.key]: e.target.value } })} className="h-8 rounded-sm border border-border-strong bg-surface px-2 text-sm">
                            {a.options.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </Td>
                      ))}
                      <Td>{r.packagingUnit}</Td>
                      <Td numeric>{r.unitsPerPack}</Td>
                      <Td numeric><Input aria-label={`Minimum order for ${r.sku}`} value={r.moq} onChange={e => update(r.id, { moq: e.target.value })} inputMode="numeric" aria-invalid={Boolean(p?.startsWith('Minimum')) || undefined} className="ml-auto h-8 w-20 text-right" /></Td>
                      <Td>{p ? <span className="text-sm font-medium text-tone-danger">{p}</span> : <Stamp tone="success" size="sm">OK</Stamp>}</Td>
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map(r => {
            const p = problem(r)
            return (
              <li key={r.id} className={cn('flex flex-col gap-2 rounded-md border bg-surface p-3', p ? 'border-tone-danger' : 'border-border')}>
                <div className="flex items-center justify-between gap-2"><code className="font-mono text-sm">{r.sku}</code>{r.active ? <Stamp tone="success" size="sm">Active</Stamp> : <Stamp tone="neutral" size="sm">Inactive</Stamp>}</div>
                <span className="font-semibold">{combo(r)}</span>
                <span className="text-sm text-muted">{r.unitsPerPack} per {r.packagingUnit} · MOQ {r.moq}</span>
                {p ? <span className="text-sm font-medium text-tone-danger">{p}</span> : null}
              </li>
            )
          })}
        </ul>
      )}
      <div className="rounded-md border border-border bg-surface">
        <TablePager result={t.result} onPage={t.setPage} onPageSize={t.setPageSize} noun={{ one: 'variant', other: 'variants' }} unfiltered={rows.length} />
      </div>
    </section>
  )
}

export type MediaItem = { id: string; name: string; url?: string; alt: string; size: number; width?: number; height?: number; state: 'uploading' | 'processing' | 'ready' | 'rejected'; progress?: number; reason?: string }

/** Product media with derivative status (SM-F-05). Reorder by buttons, not drag alone; alt text is required. */
export function MediaManager({ items: initial, layout: initialLayout = 'grid', maxBytes }: { items: readonly MediaItem[]; layout?: 'grid' | 'list'; maxBytes: number }) {
  const [items, setItems] = useState(initial)
  const [layout, setLayout] = useState(initialLayout)
  const move = (i: number, dir: -1 | 1) => setItems(list => { const next = [...list]; const [it] = next.splice(i, 1); next.splice(i + dir, 0, it!); return next })
  const status = (m: MediaItem): ReactNode =>
    m.state === 'uploading' ? <div className="flex flex-col gap-1"><Progress value={m.progress ?? 0} label={`Uploading ${m.name}`} /><span className="text-xs text-muted tabular">Uploading {m.progress ?? 0}%</span></div>
    : m.state === 'processing' ? <Stamp tone="info" condition="processing" size="sm">Making sizes</Stamp>
    : m.state === 'rejected' ? <Stamp tone="danger" size="sm" detail={m.reason}>Rejected</Stamp>
    : !m.alt.trim() ? <Stamp tone="warning" size="sm">Needs alt text</Stamp>
    : <Stamp tone="success" size="sm">Ready</Stamp>
  return (
    <section className="flex flex-col gap-3" aria-label="Product media">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col"><h3 className="font-display text-lg font-bold">Media</h3><span className="text-sm text-muted">JPEG, PNG or WebP up to {formatBytes(maxBytes)}. The first image is the cover.</span></div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" leadingIcon={ImagePlus}>Add images</Button>
          <Segmented label="Layout" size="sm" value={layout} onValueChange={setLayout} items={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} />
        </div>
      </div>
      {/* Grid cells share one rule (a container, not floating cards). */}
      <ol className={cn(layout === 'grid' ? 'grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-4' : 'flex flex-col divide-y divide-border rounded-md border border-border bg-surface')}>
        {items.map((m, i) => (
          <li key={m.id} className={cn(layout === 'grid' ? 'flex flex-col bg-surface' : 'grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 p-2', m.state === 'rejected' && 'ring-2 ring-tone-danger ring-inset')}>
            <div className={cn('relative bg-well', layout === 'grid' ? 'aspect-[4/3] border-b border-border' : 'aspect-square w-16 rounded-sm')}>
              {m.url && m.state !== 'rejected' ? <Image src={m.url} alt={m.alt || ''} fill sizes="200px" className={cn('object-contain p-[6%]', m.state !== 'ready' && 'opacity-60')} /> : null}
              {i === 0 && m.state === 'ready' ? <span className="absolute top-1.5 left-1.5"><Stamp tone="signal" size="sm">Cover</Stamp></span> : null}
            </div>
            <div className={cn('flex min-w-0 flex-col gap-1.5', layout === 'grid' && 'p-2.5')}>
              <span className="truncate text-sm font-medium" title={m.name}>{m.name}</span>
              {status(m)}
              {m.state === 'ready' ? <Input aria-label={`Alt text for ${m.name}`} placeholder="Describe the product shown" value={m.alt} onChange={e => setItems(list => list.map(x => (x.id === m.id ? { ...x, alt: e.target.value } : x)))} className="h-8 text-sm" aria-invalid={!m.alt.trim() || undefined} /> : null}
            </div>
            <div className={cn('flex gap-1', layout === 'grid' && 'border-t border-border p-1.5')}>
              <IconButton icon={ArrowUp} label={`Move ${m.name} earlier`} size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon={ArrowDown} label={`Move ${m.name} later`} size="icon-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Configured FiltersBlock whose controls are derived from the active category contract's facets. */
export function FacetFilterPanel({ meta, layout, counts, search }: { meta: ModelMeta; layout: 'sidebar' | 'sheet'; counts?: Record<string, Record<string, number>>; search?: string }) {
  const [values, setValues] = useState<FilterValues>({})
  const [q, setQ] = useState(search ?? '')
  return <FiltersBlock meta={meta} values={values} onChange={setValues} search={q} onSearchChange={setQ} layout={layout === 'sidebar' ? 'expanded' : 'sheet'} counts={counts} />
}

type HeroScene = { src: string; alt: string; width: number; height: number; blurDataURL?: string }

/**
 * A category's landing header (after the Bélanger and Tanini Home catalogues): the name set large, what the
 * category holds and how much of it there is, beside a scene photograph. Counts are passed in from the
 * listing, never computed here.
 */
export function CategoryHero({ title, description, count, sellers, breadcrumbs, scene }: {
  title: string; description: string; count: number; sellers?: number; breadcrumbs?: ReactNode; scene?: HeroScene
}) {
  return (
    <header className="@container">
      <div className="grid grid-cols-1 items-end gap-6 @3xl:grid-cols-2 @3xl:gap-10">
        <div className="flex flex-col gap-4 pb-1">
          {breadcrumbs}
          <h1 className="text-4xl font-extrabold tracking-display @5xl:text-5xl">{title}</h1>
          <p className="max-w-[46ch] text-lg text-muted">{description}</p>
          <p className="text-md tabular"><span className="font-semibold">{count.toLocaleString('en-KE')} products</span>{sellers ? <span className="text-muted"> from {sellers} wholesalers</span> : null}</p>
        </div>
        {scene ? (
          <div className="relative aspect-[3/2] overflow-hidden bg-well">
            <Image src={scene.src} alt={scene.alt} fill sizes="(min-width: 768px) 50vw, 100vw" preload placeholder={scene.blurDataURL ? 'blur' : 'empty'} blurDataURL={scene.blurDataURL} className="object-cover" />
          </div>
        ) : null}
      </div>
    </header>
  )
}
