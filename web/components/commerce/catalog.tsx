'use client'

import { ArrowDown, ArrowUp, Copy, ImagePlus, LayoutGrid, Plus, Rows3, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, type ReactNode } from 'react'
import { FiltersBlock, type FilterValues } from '@/components/kernel/blocks/FiltersBlock'
import { UrlFilters } from '@/components/kernel/blocks/UrlListControls'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import { FileView, RichTextView } from '@/components/kernel/fields/views'
import { asStringList, formatBytes, type FileValue } from '@/components/kernel/fields/types'
import { ProjectedForm, type FormRecipe, type SubmitResult } from '@/components/kernel/forms/ProjectedForm'
import { Button, IconButton } from '@/components/ui/button'
import { Checkbox, Segmented } from '@/components/ui/choice'
import type { ComboOption } from '@/components/ui/combobox'
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
import type { FieldMeta, ListFacets, ModelMeta, Tone } from '@/lib/contract/types'
import { formatDate } from '@/lib/format'

export type SellerStatus = 'draft' | 'under_review' | 'active' | 'rejected' | 'suspended'
const sellerLook: Record<SellerStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' }, under_review: { tone: 'info', label: 'Under review' }, active: { tone: 'success', label: 'Active' },
  rejected: { tone: 'danger', label: 'Rejected' }, suspended: { tone: 'warning', label: 'Suspended' },
}
export type SellerDocument = {
  id?: string; type: string; file: FileValue; status: 'pending' | 'verified' | 'rejected' | 'expired'; expiresAt?: string; notes?: string
  /** The document's own commands (verify, reject, remove) from the contract, rendered by the page. */
  actions?: ReactNode
}
const docLook: Record<SellerDocument['status'], { tone: Tone; label: string }> = {
  pending: { tone: 'info', label: 'Pending check' }, verified: { tone: 'success', label: 'Verified' }, rejected: { tone: 'danger', label: 'Rejected' }, expired: { tone: 'warning', label: 'Expired' },
}

// Mirrors SellerProfile.rejection_reason in the field specification (SM-F-02); pages pass the contract's field.
const rejectionField: FieldMeta = { name: 'rejection_reason', type: 'text', widget: 'textarea', label: 'Reason', required: true, maxLength: 1000, help: 'Sent to the seller; keep it specific and actionable.' }

export type SellerDecision = 'approve' | 'reject' | 'suspend' | 'reinstate'
const decisionCopy: Record<SellerDecision, { title: (s: string) => string; description: string; confirm: string; needsReason: boolean }> = {
  approve: { title: s => `Approve ${s}?`, description: 'They can publish products and receive orders immediately.', confirm: 'Approve seller', needsReason: false },
  reinstate: { title: s => `Reinstate ${s}?`, description: 'Their published products return to the catalogue and they can take orders again.', confirm: 'Reinstate seller', needsReason: false },
  reject: { title: s => `Reject ${s}`, description: 'The seller sees this reason and can resubmit.', confirm: 'Reject seller', needsReason: true },
  suspend: { title: s => `Suspend ${s}`, description: 'Their products are hidden and open orders are flagged for review.', confirm: 'Suspend seller', needsReason: true },
}

/**
 * Marketplace-admin seller review (SM-F-02): unapproved sellers cannot publish or receive orders.
 * `blockers` are the API's reasons approval is not possible yet (unverified documents); `onDecide`
 * runs the decision and rejects with the API's error, which the sheet shows in place.
 */
export function SellerOnboardingReviewBlock({ seller, location, status, documents, history, blockers = [], reason, reasonField = rejectionField, onDecide }: {
  seller: string; location: string; status: SellerStatus; documents: readonly SellerDocument[]
  history: readonly { status: SellerStatus; at: string; by: string; reason?: string }[]
  blockers?: readonly string[]; reason?: string; reasonField?: FieldMeta
  onDecide?: (decision: SellerDecision, reason: string) => Promise<void>
}) {
  const [view, setView] = useState<'summary' | 'full'>('summary')
  const [decision, setDecision] = useState<SellerDecision | null>(null)
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<{ detail: string; fields?: Record<string, string[]> } | null>(null)
  const verified = documents.filter(d => d.status === 'verified').length
  const steps: ThreadStep[] = history.map((h, i) => ({
    key: `${h.status}-${i}`, label: sellerLook[h.status].label,
    detail: `${formatDate(h.at)} · ${h.by}${h.reason ? ` · ${h.reason}` : ''}`,
    state: h.status === 'rejected' || h.status === 'suspended' ? 'failed' : i === history.length - 1 && h.status === 'under_review' ? 'current' : 'done',
  }))
  const copy = decision ? decisionCopy[decision] : null
  const open = (d: SellerDecision) => { setDecision(d); setText(''); setProblem(null) }
  const confirm = async () => {
    if (!decision) return
    if (!onDecide) { setDecision(null); return }
    setPending(true)
    try {
      await onDecide(decision, text.trim())
      setDecision(null)
    } catch (err) {
      const e = err as { detail?: string; fields?: Record<string, string[]> }
      setProblem({ detail: e.detail ?? 'The decision was not saved. Try again.', fields: e.fields })
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label={`Seller review: ${seller}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col"><h3 className="font-display text-xl font-bold">{seller}</h3><span className="text-sm text-muted">{location} · {verified} of {documents.length} documents verified</span></div>
        <Stamp tone={sellerLook[status].tone}>{sellerLook[status].label}</Stamp>
      </div>
      {reason && (status === 'rejected' || status === 'suspended') ? (
        <p className="border-l-[length:var(--border-stamp)] border-tone-danger bg-tone-danger-bg/50 px-3 py-2 text-md"><span className="font-semibold">Reason given: </span>{reason}</p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-sans text-md font-semibold">Documents</h4>
        <Segmented label="Document view" size="sm" value={view} onValueChange={setView} items={[{ value: 'summary', label: 'Summary' }, { value: 'full', label: 'Full' }]} />
      </div>
      {documents.length ? (
        <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
          {documents.map(d => (
            <li key={d.id ?? d.type} className="flex flex-col gap-1.5 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{d.type}</span><Stamp tone={docLook[d.status].tone} size="sm">{docLook[d.status].label}</Stamp></div>
              {view === 'full' ? (
                <>
                  <FileView field={{ name: 'file', type: 'file', widget: 'file' }} value={d.file} />
                  <span className="text-sm text-muted">{d.expiresAt ? `Valid until ${formatDate(d.expiresAt)}` : 'No expiry'}{d.notes ? ` · ${d.notes}` : ''}</span>
                </>
              ) : null}
              {d.actions ? <div className="pt-1">{d.actions}</div> : null}
            </li>
          ))}
        </ul>
      ) : <p className="rounded-sm border border-dashed border-border-strong px-3 py-4 text-md text-muted">No documents uploaded yet.</p>}
      <div className="flex flex-col gap-2"><h4 className="font-sans text-md font-semibold">Activation history</h4>
        {steps.length ? <Thread orientation="vertical" label="Seller activation history" steps={steps} /> : <p className="text-md text-muted">Not sent for review yet.</p>}
      </div>
      {status === 'under_review' || status === 'active' || status === 'suspended' ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {status === 'under_review' ? <Button variant="primary" onClick={() => open('approve')} disabled={blockers.length > 0}>Approve seller</Button> : null}
          {status === 'suspended' ? <Button variant="primary" onClick={() => open('reinstate')} disabled={blockers.length > 0}>Reinstate seller</Button> : null}
          {status === 'under_review' ? <Button variant="danger-outline" onClick={() => open('reject')}>Reject</Button> : null}
          {status === 'active' ? <Button variant="warning-outline" onClick={() => open('suspend')}>Suspend seller</Button> : null}
          {blockers.length && status !== 'active' ? (
            <ul className="flex w-full flex-col gap-0.5 text-sm text-muted">{blockers.map(b => <li key={b}>{b}</li>)}</ul>
          ) : null}
        </div>
      ) : null}
      <Sheet open={decision !== null} onOpenChange={o => { if (!o && !pending) setDecision(null) }} title={copy?.title(seller) ?? ''} description={copy?.description}
        footer={<><Button variant="secondary" onClick={() => setDecision(null)} disabled={pending}>Cancel</Button><Button variant={copy?.needsReason ? 'danger' : 'primary'} loading={pending} loadingLabel="Saving…" disabled={Boolean(copy?.needsReason) && !text.trim()} onClick={() => void confirm()}>{copy?.confirm}</Button></>}>
        <div className="flex flex-col gap-3">
          {copy?.needsReason
            ? <FieldInput field={reasonField} value={text} onChange={v => setText(String(v ?? ''))} error={problem?.fields?.[reasonField.name]?.[0]} />
            : <p className="text-md">{documents.length ? `${verified} of ${documents.length} documents are verified.` : 'No documents on file.'}</p>}
          {problem && !problem.fields?.[reasonField.name] ? (
            <div role="alert" className="flex flex-col gap-1 border border-tone-danger bg-tone-danger-bg/60 px-3 py-2 text-md">
              <span className="font-semibold">{problem.detail}</span>
              {Object.values(problem.fields ?? {}).flat().map(m => <span key={m}>{m}</span>)}
            </div>
          ) : null}
        </div>
      </Sheet>
    </section>
  )
}

export type ProductStatus = 'draft' | 'published' | 'suspended' | 'archived'
const productLook: Record<ProductStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' }, published: { tone: 'success', label: 'Published' }, suspended: { tone: 'warning', label: 'Suspended' }, archived: { tone: 'neutral', label: 'Archived' },
}

/**
 * Configured ProjectedForm (SM-F-04): a seller's product, its status and commands (`actions`, from the
 * contract), and why it cannot be published yet. The category's own details are generated from its
 * contract below the form (`children`, usually CategoryDetailsForm), so no category needs its own page.
 */
export function ProductEditorBlock({ meta, mode, layout = 'inline', status, initial, fields, options, publishBlockers = [], actions, onSubmit, category, children }: {
  meta: ModelMeta; mode: 'create' | 'edit'; layout?: Extract<FormRecipe, 'inline' | 'stepper'>; status: ProductStatus; initial?: Record<string, unknown>
  fields?: readonly string[]; options?: Record<string, readonly ComboOption[]>; publishBlockers?: readonly string[]; actions?: ReactNode
  onSubmit: (v: Record<string, unknown>) => Promise<SubmitResult>; category: string; children?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label={mode === 'create' ? 'New product' : 'Edit product'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col"><h3 className="font-display text-xl font-bold">{mode === 'create' ? 'New product' : String(initial?.name ?? 'Product')}</h3><span className="text-sm text-muted">{category ? `Category: ${category} · its details come from the category contract` : 'Choose a category: its contract decides the details a product needs'}</span></div>
        <div className="flex flex-wrap items-center gap-2">
          <Stamp tone={productLook[status].tone}>{productLook[status].label}</Stamp>
          {actions}
        </div>
      </div>
      {status === 'draft' && publishBlockers.length ? (
        <div className="flex flex-col gap-1 border border-tone-warning bg-tone-warning-bg/60 px-3 py-2 text-md">
          <span className="font-semibold">Before it can be published</span>
          <ul className="list-disc pl-5">{publishBlockers.map(b => <li key={b}>{b}</li>)}</ul>
        </div>
      ) : null}
      <ProjectedForm meta={meta} mode={mode} recipe={layout} fields={fields} options={options} initial={initial} onSubmit={onSubmit} submitLabel={mode === 'create' ? 'Save draft' : 'Save changes'} />
      {children}
    </section>
  )
}

/** The API's answer to saving category details: done, or its message with field problems (`attributes.<key>`). */
export type DetailsOutcome = { ok: true } | { ok: false; detail: string; fields: Record<string, string[]> }

/**
 * A product's category details, generated from its contract's attributes (SM-F-03 drives SM-F-04): one
 * typed control per attribute, the category's guidance for sellers beside them, and field-level messages
 * from the API when a value is not one the contract allows.
 */
export function CategoryDetailsForm({ fields, values: initial, guidance, onSave, saving }: {
  fields: readonly FieldMeta[]; values: Record<string, unknown>; guidance?: { html: string; text: string }
  onSave?: (values: Record<string, unknown>) => Promise<DetailsOutcome>; saving?: boolean
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const [dirty, setDirty] = useState(false)
  const [answer, setAnswer] = useState<{ detail: string; fields: Record<string, string[]> } | null>(null)
  const save = async () => {
    if (!onSave) return
    const out = await onSave(values)
    if (out.ok) { setDirty(false); setAnswer(null) } else setAnswer({ detail: out.detail, fields: out.fields })
  }
  const missing = fields.filter(f => f.required && (values[f.name] === null || values[f.name] === undefined || values[f.name] === '')).length
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-4" aria-labelledby="category-details">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 id="category-details" className="font-sans text-md font-semibold">Category details</h4>
        {missing ? <span className="text-sm text-muted">{missing} required {missing === 1 ? 'detail' : 'details'} to fill before publishing</span> : null}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        {fields.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(f => (
              <FieldInput key={f.name} field={onSave ? f : { ...f, readOnly: true }} value={values[f.name] ?? null} mirror={false}
                error={answer?.fields[`attributes.${f.name}`]?.[0]}
                onChange={v => { setValues(s => ({ ...s, [f.name]: v })); setDirty(true) }} />
            ))}
          </div>
        ) : <p className="text-md text-muted">This category asks for no extra details.</p>}
        {guidance?.text.trim() ? (
          <aside className="flex flex-col gap-1.5 border-l-[length:var(--border-stamp)] border-signal-border bg-signal-soft px-4 py-3 text-md">
            <span className="font-semibold">From the marketplace</span>
            <RichTextView field={{ name: 'seller_guidance', type: 'richtext', widget: 'richtext' }} value={guidance} context="comfortable" />
          </aside>
        ) : null}
      </div>
      {answer ? <p role="alert" className="text-md font-medium text-tone-danger">{answer.detail}</p> : null}
      {onSave ? <Button variant="primary" className="self-start" disabled={!dirty} loading={saving} loadingLabel="Saving…" onClick={() => void save()}>Save details</Button> : null}
    </section>
  )
}

export type VariantRow = {
  id: string; sku: string; attributes: Record<string, string>; packagingUnit: string; unitsPerPack: string; moq: string; active: boolean
  /** Price per pack as typed; packs available (empty: not tracked), read from the stock ledger and never edited here. */
  price?: string; stock?: string
  /** Made here and not saved yet. */
  isNew?: boolean
  /** The pack in words, from the server ("Bale of 12 × 2 kg"). */
  packLabel?: string
}
type Choice = { value: string; label: string }
/** Server problems after a save: row id, then field, then the message. */
export type VariantErrors = Record<string, Record<string, string>>

const isNumber = (s: string | undefined, whole = false) => Boolean(s) && (whole ? /^\d+$/ : /^\d+(\.\d+)?$/).test(String(s).trim())

/**
 * Variants (SM-F-04): each sellable pack of a product, with any per-variant attributes from the category
 * contract. Rows are edited in place and saved together; duplicates, minimum orders and prices are checked
 * here for quick feedback, and the API's own answer per row is shown in place. Search covers the SKU and
 * attribute values; facets narrow by status, by what needs fixing and by each variant attribute.
 */
export function VariantMatrixEditor({ attributes, units, rows: initialRows, layout: initialLayout = 'table', onSave, saving }: {
  attributes: readonly { key: string; label: string; options: readonly (string | Choice)[] }[]
  /** Units the category sells by (the contract's sale units); a row's unit must be one of them. */
  units?: readonly Choice[]
  rows: readonly VariantRow[]
  layout?: 'table' | 'cards'
  /** Save the changed and new rows; resolves with each row's problems (empty when all were saved). */
  onSave?: (rows: VariantRow[]) => Promise<VariantErrors>
  saving?: boolean
}) {
  const [rows, setRows] = useState<VariantRow[]>([...initialRows])
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const [server, setServer] = useState<VariantErrors>({})
  const [layout, setLayout] = useState(initialLayout)
  const [bulk, setBulk] = useState(false)
  const [fill, setFill] = useState({ moq: '', price: '' })
  const editable = Boolean(onSave)
  const opts = (a: (typeof attributes)[number]): Choice[] => a.options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))
  const unitOptions = units ?? [...new Set(rows.map(r => r.packagingUnit))].map(u => ({ value: u, label: u }))
  const unitName = (u: string) => unitOptions.find(o => o.value === u)?.label ?? u
  const combo = (r: VariantRow) => [r.packagingUnit, r.unitsPerPack, ...attributes.map(a => r.attributes[a.key])].join(' · ')
  const dupes = new Set(rows.map(combo).filter((c, i, all) => all.indexOf(c) !== i))
  const skus = rows.map(r => r.sku.trim().toUpperCase())
  const clientProblem = (r: VariantRow): string | null =>
    !r.sku.trim() ? 'Give it a SKU'
    : skus.filter(s => s === r.sku.trim().toUpperCase()).length > 1 ? 'Another variant uses this SKU'
    : dupes.has(combo(r)) ? 'Same pack and details as another variant'
    : !isNumber(r.moq, true) || Number(r.moq) < 1 ? 'Minimum order must be at least 1'
    : !isNumber(r.unitsPerPack) || Number(r.unitsPerPack) <= 0 ? 'A pack holds at least one unit'
    : r.price !== undefined && (!isNumber(r.price) || Number(r.price) <= 0) ? 'Set a price above zero'
    : null
  // The API's answer for a row (after a save) shows until the row is edited again.
  const problem = (r: VariantRow) => clientProblem(r) ?? Object.values(server[r.id] ?? {})[0] ?? null
  const update = (id: string, patch: Partial<VariantRow>) => {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
    setChanged(c => new Set(c).add(id))
    setServer(s => Object.fromEntries(Object.entries(s).filter(([key]) => key !== id)))
  }
  const add = () => {
    const id = `new-${Date.now()}`
    const first = rows[0]
    setRows(rs => [...rs, {
      id, isNew: true, sku: '', active: true, packagingUnit: first?.packagingUnit ?? unitOptions[0]?.value ?? '', unitsPerPack: first?.unitsPerPack ?? '1', moq: first?.moq ?? '1', price: '', stock: '',
      attributes: Object.fromEntries(attributes.map(a => [a.key, opts(a)[0]?.value ?? ''])),
    }])
    setChanged(c => new Set(c).add(id))
  }
  const pendingRows = rows.filter(r => changed.has(r.id))
  const invalid = rows.filter(problem).length
  const save = async () => {
    if (!onSave) return
    const errs = await onSave(pendingRows)
    setServer(errs)
    setChanged(new Set(Object.keys(errs)))
  }
  // Reads the current rows (the duplicate check depends on all of them), so the result follows every edit.
  const access: Accessors<VariantRow> = {
    text: r => [r.sku, r.packagingUnit, r.packLabel, ...Object.values(r.attributes)],
    value: (r, key) => key === 'status' ? (r.active ? 'active' : 'inactive') : key === 'check' ? (problem(r) ? 'fix' : 'ok') : key.startsWith('attr:') ? r.attributes[key.slice(5)] : undefined,
  }
  const t = useTableQuery(rows, access, { pageSize: 10 })
  const facet = (key: string, label: string, options: readonly Choice[]) => {
    const counts = t.counts(key)
    return <FacetChips key={key} label={label} options={options.map(o => ({ ...o, count: counts[o.value] ?? 0 }))} value={asStringList(t.query.filters[key]?.value)}
      onChange={next => t.setFilter(key, next.length ? ({ op: 'in', value: next } satisfies FilterValue) : undefined)} />
  }
  const shown = t.result.rows
  const cell = 'h-8 rounded-sm border border-border-strong bg-surface px-2 text-sm disabled:opacity-60'
  return (
    <section className="flex flex-col gap-3" aria-label="Variants">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3"><h3 className="font-display text-lg font-bold">Variants</h3>{invalid ? <Stamp tone="danger" size="sm">{invalid} to fix</Stamp> : <Stamp tone="success" size="sm">All valid</Stamp>}</div>
        <div className="flex flex-wrap items-center gap-2">
          {editable ? <Button size="sm" variant="secondary" leadingIcon={Plus} onClick={add}>Add variant</Button> : null}
          <Button size="sm" variant={bulk ? 'primary' : 'secondary'} leadingIcon={Copy} aria-pressed={bulk} onClick={() => setBulk(b => !b)}>Bulk fill</Button>
          <Segmented label="Layout" size="sm" value={layout} onValueChange={setLayout} items={[{ value: 'table', label: <span className="inline-flex items-center gap-1"><Rows3 className="size-3.5" aria-hidden />Table</span> }, { value: 'cards', label: <span className="inline-flex items-center gap-1"><LayoutGrid className="size-3.5" aria-hidden />Cards</span> }]} />
        </div>
      </div>
      {bulk ? (
        <div className="flex flex-wrap items-end gap-2 rounded-sm border border-signal-border bg-signal-soft p-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">Minimum order<Input value={fill.moq} onChange={e => setFill(f => ({ ...f, moq: e.target.value }))} inputMode="numeric" className="w-28" /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold">Price per pack<Input value={fill.price} prefix="KES" onChange={e => setFill(f => ({ ...f, price: e.target.value.replace(/[^\d.]/g, '') }))} inputMode="decimal" className="w-36" /></label>
          <Button size="md" variant="primary" onClick={() => { for (const r of rows) update(r.id, { ...(fill.moq ? { moq: fill.moq } : {}), ...(fill.price ? { price: fill.price } : {}) }) }}>Apply to all {rows.length}</Button>
        </div>
      ) : null}
      <TableToolbar active={t.active} onClear={t.clear}
        search={<TableSearch label="Search variants" placeholder="SKU, pack or attribute…" value={t.query.q} onChange={t.setSearch} />}
        facets={<>
          {facet('status', 'Status', [{ value: 'active', label: 'On sale' }, { value: 'inactive', label: 'Off sale' }])}
          {facet('check', 'Check', [{ value: 'fix', label: 'To fix' }, { value: 'ok', label: 'OK' }])}
          {attributes.map(a => facet(`attr:${a.key}`, a.label, opts(a)))}
        </>} />
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState kind="no-data" title="No variants yet" description="A variant is what buyers order: a SKU, its pack, minimum order and price. Add the first one." action={editable ? <Button variant="primary" leadingIcon={Plus} onClick={add}>Add variant</Button> : undefined} />
        </div>
      ) : t.result.total === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState kind="no-results" title="No variants match" description="Try another SKU or remove a filter." action={<Button variant="secondary" onClick={t.clear}>Clear search and filters</Button>} />
        </div>
      ) : layout === 'table' ? (
        <div className="overflow-hidden rounded-md border border-border bg-surface" data-density="compact">
          <ScrollArea label="Variants table, scrolls sideways">
            <Table caption="Variants">
              <THead><tr><Th>On sale</Th><Th>SKU</Th>{attributes.map(a => <Th key={a.key}>{a.label}</Th>)}<Th>Sold by the</Th><Th numeric>Units/pack</Th><Th numeric>MOQ</Th>{rows.some(r => r.price !== undefined) ? <><Th numeric>Price (KES)</Th><Th numeric>In stock</Th></> : null}<Th>Check</Th></tr></THead>
              <TBody>
                {shown.map(r => {
                  const p = problem(r)
                  const touched = changed.has(r.id)
                  return (
                    <Tr key={r.id} className={cn(p && 'bg-tone-danger-bg/30', !p && touched && 'bg-signal-soft/50')}>
                      <Td><Checkbox aria-label={`${r.sku || 'New variant'} on sale`} checked={r.active} onCheckedChange={c => update(r.id, { active: c === true })} /></Td>
                      <Td>{r.isNew ? <Input aria-label="SKU" value={r.sku} onChange={e => update(r.id, { sku: e.target.value.toUpperCase() })} className="h-8 w-32 font-mono text-sm" /> : <code className="font-mono text-sm">{r.sku}</code>}</Td>
                      {attributes.map(a => (
                        <Td key={a.key}>
                          <select aria-label={`${a.label} for ${r.sku || 'new variant'}`} value={r.attributes[a.key]} onChange={e => update(r.id, { attributes: { ...r.attributes, [a.key]: e.target.value } })} className={cell}>
                            {opts(a).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </Td>
                      ))}
                      <Td>
                        <select aria-label={`Unit for ${r.sku || 'new variant'}`} value={r.packagingUnit} onChange={e => update(r.id, { packagingUnit: e.target.value })} className={cell}>
                          {unitOptions.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        {r.packLabel ? <span className="mt-1 block text-xs text-muted">{r.packLabel}</span> : null}
                      </Td>
                      <Td numeric><Input aria-label={`Units per pack for ${r.sku || 'new variant'}`} value={r.unitsPerPack} onChange={e => update(r.id, { unitsPerPack: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" className="ml-auto h-8 w-20 text-right" /></Td>
                      <Td numeric><Input aria-label={`Minimum order for ${r.sku || 'new variant'}`} value={r.moq} onChange={e => update(r.id, { moq: e.target.value.replace(/\D/g, '') })} inputMode="numeric" aria-invalid={Boolean(p?.startsWith('Minimum')) || undefined} className="ml-auto h-8 w-20 text-right" /></Td>
                      {r.price !== undefined ? <>
                        <Td numeric><Input aria-label={`Price per pack for ${r.sku || 'new variant'}`} value={r.price} onChange={e => update(r.id, { price: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" className="ml-auto h-8 w-28 text-right tabular" /></Td>
                        <Td numeric className="tabular">{r.stock ? r.stock : <span className="text-sm text-muted">Not tracked</span>}</Td>
                      </> : rows.some(x => x.price !== undefined) ? <><Td /><Td /></> : null}
                      <Td>{p ? <span className="text-sm font-medium text-tone-danger">{p}</span> : touched ? <Stamp tone="signal" size="sm">Changed</Stamp> : <Stamp tone="success" size="sm">OK</Stamp>}</Td>
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
                <div className="flex items-center justify-between gap-2"><code className="font-mono text-sm">{r.sku || 'New variant'}</code>{r.active ? <Stamp tone="success" size="sm">On sale</Stamp> : <Stamp tone="neutral" size="sm">Off sale</Stamp>}</div>
                <span className="font-semibold">{r.packLabel ?? `${unitName(r.packagingUnit)} of ${r.unitsPerPack}`}</span>
                <span className="text-sm text-muted">MOQ {r.moq}{r.price ? ` · KES ${r.price}` : ''}{r.stock ? ` · ${r.stock} in stock` : ''}{attributes.length ? ` · ${attributes.map(a => opts(a).find(o => o.value === r.attributes[a.key])?.label ?? r.attributes[a.key]).join(', ')}` : ''}</span>
                {p ? <span className="text-sm font-medium text-tone-danger">{p}</span> : null}
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface">
        <TablePager result={t.result} onPage={t.setPage} onPageSize={t.setPageSize} noun={{ one: 'variant', other: 'variants' }} unfiltered={rows.length} className="flex-1" />
        {editable ? (
          <div className="px-3 pb-2.5 sm:pb-0">
            <Button variant="primary" size="sm" disabled={!pendingRows.length || pendingRows.some(r => clientProblem(r))} loading={saving} loadingLabel="Saving…" onClick={() => void save()}>
              {pendingRows.length ? `Save ${pendingRows.length} ${pendingRows.length === 1 ? 'variant' : 'variants'}` : 'Saved'}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export type MediaItem = { id: string; name: string; url?: string; alt: string; size: number; width?: number; height?: number; state: 'uploading' | 'processing' | 'ready' | 'rejected'; progress?: number; reason?: string }

/**
 * Product media with derivative status (SM-F-05). Reorder by buttons, not drag alone; alt text is required.
 * With `onUpload`, `onAlt`, `onMove` and `onRemove` the page persists each change (alt text on blur); without
 * them the manager keeps its own state, as a preview. `accept` and `maxBytes` are the contract's upload rule.
 */
export function MediaManager({ items: initial, layout: initialLayout = 'grid', maxBytes, accept = ['image/jpeg', 'image/png', 'image/webp'], onUpload, onAlt, onMove, onRemove, busy }: {
  items: readonly MediaItem[]; layout?: 'grid' | 'list'; maxBytes: number; accept?: readonly string[]
  onUpload?: (files: File[]) => void; onAlt?: (id: string, alt: string) => void; onMove?: (id: string, to: number) => void; onRemove?: (id: string) => void; busy?: boolean
}) {
  const [items, setItems] = useState(initial)
  const [layout, setLayout] = useState(initialLayout)
  const fileRef = useRef<HTMLInputElement>(null)
  const move = (i: number, dir: -1 | 1) => {
    const m = items[i]
    setItems(list => { const next = [...list]; const [it] = next.splice(i, 1); next.splice(i + dir, 0, it!); return next })
    if (m) onMove?.(m.id, i + dir)
  }
  const kinds = accept.map(a => a.split('/')[1]!.toUpperCase()).join(', ')
  const status = (m: MediaItem): ReactNode =>
    m.state === 'uploading' ? <div className="flex flex-col gap-1"><Progress value={m.progress ?? 0} label={`Uploading ${m.name}`} /><span className="text-xs text-muted tabular">Uploading {m.progress ?? 0}%</span></div>
    : m.state === 'processing' ? <Stamp tone="info" condition="processing" size="sm">Checking</Stamp>
    : m.state === 'rejected' ? <Stamp tone="danger" size="sm">Rejected</Stamp>
    : !m.alt.trim() ? <Stamp tone="warning" size="sm">Needs alt text</Stamp>
    : <Stamp tone="success" size="sm">Ready</Stamp>
  return (
    <section className="flex flex-col gap-3" aria-label="Product media">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col"><h3 className="font-display text-lg font-bold">Media</h3><span className="text-sm text-muted">{kinds} up to {formatBytes(maxBytes)}, at least 600 pixels on the long side. The first ready image is the cover; location and camera details are removed before buyers see it.</span></div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" leadingIcon={ImagePlus} loading={busy} loadingLabel="Uploading…" onClick={() => fileRef.current?.click()}>Add images</Button>
          <input ref={fileRef} type="file" multiple accept={accept.join(',')} className="sr-only" tabIndex={-1} aria-hidden onChange={e => { const files = [...(e.target.files ?? [])]; if (files.length) onUpload?.(files); e.target.value = '' }} />
          <Segmented label="Layout" size="sm" value={layout} onValueChange={setLayout} items={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} />
        </div>
      </div>
      {items.length ? (
        /* Grid cells share rules (a container, not floating cards); a short last row leaves open ground. */
        <ol className={cn(layout === 'grid' ? 'grid grid-cols-2 border-t border-l border-border sm:grid-cols-3 lg:grid-cols-4' : 'flex flex-col divide-y divide-border rounded-md border border-border bg-surface')}>
          {items.map((m, i) => (
            <li key={m.id} className={cn(layout === 'grid' ? 'flex flex-col border-r border-b border-border bg-surface' : 'grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 p-2', m.state === 'rejected' && 'ring-2 ring-tone-danger ring-inset')}>
              <div className={cn('relative bg-well', layout === 'grid' ? 'aspect-[4/3] border-b border-border' : 'aspect-square w-16 rounded-sm')}>
                {m.url && m.state !== 'rejected' ? <Image src={m.url} alt={m.alt || ''} fill sizes="200px" unoptimized className={cn('object-contain p-[6%]', m.state !== 'ready' && 'opacity-60')} /> : null}
                {i === items.findIndex(x => x.state === 'ready') && m.state === 'ready' ? <span className="absolute top-1.5 left-1.5"><Stamp tone="signal" size="sm">Cover</Stamp></span> : null}
              </div>
              <div className={cn('flex min-w-0 flex-col gap-1.5', layout === 'grid' && 'p-2.5')}>
                <span className="truncate text-sm font-medium" title={m.name}>{m.name}</span>
                {status(m)}
                {m.state === 'rejected' && m.reason ? <span className="text-sm text-tone-danger">{m.reason}</span> : null}
                {m.state === 'ready' ? (
                  <Input aria-label={`Alt text for ${m.name}`} placeholder="Describe the product shown" value={m.alt}
                    onChange={e => setItems(list => list.map(x => (x.id === m.id ? { ...x, alt: e.target.value } : x)))}
                    onBlur={e => { const was = initial.find(x => x.id === m.id)?.alt; if (e.target.value.trim() && e.target.value !== was) onAlt?.(m.id, e.target.value.trim()) }}
                    className="h-8 text-sm" aria-invalid={!m.alt.trim() || undefined} />
                ) : null}
              </div>
              <div className={cn('flex gap-1', layout === 'grid' && 'border-t border-border p-1.5')}>
                <IconButton icon={ArrowUp} label={`Move ${m.name} earlier`} size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} />
                <IconButton icon={ArrowDown} label={`Move ${m.name} later`} size="icon-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} />
                {onRemove ? <IconButton icon={Trash2} label={`Remove ${m.name}`} size="icon-sm" className="ml-auto" onClick={() => onRemove(m.id)} /> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState kind="no-data" title="No photographs yet" description="Add a clear photograph of the pack on a plain background; buyers see the first one in search and on the product page." size="inline" />
      )}
    </section>
  )
}

/**
 * The storefront's filters (SM-F-08): the listing's filters and the active category contract's facets, with
 * live counts per choice and a price slider over the current results (`facets` from the list answer). By
 * default they read and write the URL, so every filtered page is server-rendered and shareable; pass
 * `values` and `onChange` to drive a listing held in memory instead.
 */
export function FacetFilterPanel({ meta, fields, layout, facets, counts, options, values, onChange, search, onSearchChange }: {
  meta: ModelMeta; fields?: readonly string[]; layout: 'sidebar' | 'sheet'
  /** The list answer's facets: counts, seller choices and the price range. */
  facets?: ListFacets
  counts?: Record<string, Record<string, number>>
  /** Choices for relation facets (sellers), keyed by field. */
  options?: Record<string, readonly ComboOption[]>
  values?: FilterValues; onChange?: (values: FilterValues) => void; search?: string; onSearchChange?: (q: string) => void
}) {
  const shared = {
    meta, fields, layout: layout === 'sidebar' ? 'expanded' as const : 'sheet' as const,
    counts: counts ?? facets?.counts,
    // The API's price range is over `unit_price`, the listing's price filter.
    bounds: facets?.price ? { unit_price: facets.price } : undefined,
    options: { ...(facets?.options.seller ? { seller: facets.options.seller } : {}), ...options },
  }
  if (values && onChange) return <FiltersBlock {...shared} values={values} onChange={onChange} search={search} onSearchChange={onSearchChange} />
  return <UrlFilters {...shared} />
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
