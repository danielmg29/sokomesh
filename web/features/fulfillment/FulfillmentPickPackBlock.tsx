'use client'

// Divergent (spec p.55): warehouse picking is a scanner-driven task flow with per-line decisions (all, part
// with a reason, none with a reason), large touch targets and one primary action at a time. It reuses the
// kernel's field inputs and the Thread primitive, but its sequence is bespoke. Which step shows is the pick
// list's own status (`fulfillment_task`); every decision is the API's to accept, and its messages for a line
// (`picks.<line>`) appear on that line. No substitutes: the contract has no substitution, so a missing pack
// is picked short and refunded.

import { Check, PackageCheck, ScanLine, Truck } from 'lucide-react'
import { useState } from 'react'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import { FileView } from '@/components/kernel/fields/views'
import type { FileValue } from '@/components/kernel/fields/types'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Stamp } from '@/components/ui/stamp'
import { Thread, type ThreadStep } from '@/components/ui/thread'
import { cn } from '@/lib/cn'
import { FulfillmentTaskMeta, uploads } from '@/lib/contract/generated'
import type { AppError, FieldMeta } from '@/lib/contract/types'

export type PickOutcome = 'pending' | 'full' | 'short' | 'rejected'
export type PickLine = { id: string; bin?: string | null; product: string; packLabel?: string; sku: string; ordered: number; unit: string; onShelf?: number | null; picked: number; outcome: PickOutcome; reason?: string | null }
export type TaskStatus = 'queued' | 'picking' | 'packed' | 'handed_over' | 'cancelled'
export type Pick = { line: string; picked: number; reason: string }
type Decision = { picked: number; outcome: PickOutcome; reason: string }

const field = (name: string) => FulfillmentTaskMeta.fields.find(f => f.name === name) as FieldMeta
// The reason travels inside `picks`; the API refuses a short line without one (at most 300 characters).
const shortReason: FieldMeta = { name: 'reason', type: 'text', widget: 'textarea', label: 'Why is this short?', required: true, maxLength: 300, help: 'The buyer reads this on their order.' }
const pickedField: FieldMeta = { name: 'picked', type: 'integer', widget: 'integer', label: 'Packs picked', required: true }
const evidenceField: FieldMeta = { ...field('evidence_file'), required: true, accept: [...uploads.document.types], maxBytes: uploads.document.maxBytes }
const PACK = ['packages', 'weight_kg'] as const
const HANDOVER = ['carrier_name', 'carrier_reference', 'estimated_end_at', 'driver_name', 'vehicle_registration'] as const

const outcomeLook = {
  pending: { tone: 'neutral', label: 'To pick' }, full: { tone: 'success', label: 'Picked' }, short: { tone: 'warning', label: 'Short' }, rejected: { tone: 'danger', label: 'None picked' },
} as const

type Props = {
  order: string
  status: TaskStatus
  lines: readonly PickLine[]
  buyer?: string
  deliverTo?: string
  instructions?: string
  /** The handover photo, once the order is handed over. */
  evidence?: FileValue | null
  /** The command running now (`record_picks`, `pack`, `hand_over`), and the API's answer to the last one. */
  pending?: string | null
  error?: AppError | null
  onRecordPicks?: (picks: Pick[]) => Promise<unknown>
  onPack?: (values: Record<string, unknown>) => Promise<unknown>
  onHandOver?: (values: Record<string, unknown>) => Promise<unknown>
}

const fromLines = (lines: readonly PickLine[]) => Object.fromEntries(lines.map(l => [l.id, { picked: l.picked, outcome: l.outcome, reason: l.reason ?? '' }]))

export function FulfillmentPickPackBlock({ order, status, lines, buyer, deliverTo, instructions, evidence, pending = null, error, onRecordPicks, onPack, onHandOver }: Props) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => fromLines(lines))
  const [scan, setScan] = useState('')
  const [scanNote, setScanNote] = useState('')
  const [revisit, setRevisit] = useState(false)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const decided = lines.filter(l => decisions[l.id]?.outcome !== 'pending')
  const savedAll = lines.every(l => l.outcome !== 'pending')
  const changed = lines.some(l => { const d = decisions[l.id]!; return d.outcome !== l.outcome || d.picked !== l.picked || d.reason !== (l.reason ?? '') })
  const step = status === 'handed_over' ? 'done' : status === 'packed' ? 'handover' : status === 'cancelled' ? 'cancelled' : savedAll && !revisit && !changed ? 'pack' : 'pick'
  const decide = (id: string, d: Partial<Decision>) => setDecisions(s => ({ ...s, [id]: { ...s[id]!, ...d } }))
  const fieldError = (name: string) => error?.fields?.[name]?.[0]

  // Scanners type the SKU and press Enter; each scan adds one pack to the matching line.
  const onScan = () => {
    const line = lines.find(l => l.sku.toUpperCase() === scan.trim().toUpperCase())
    if (!line) { setScanNote(`No line on this pick list has the SKU ${scan}. Check the pack or type its SKU.`); setScan(''); return }
    const d = decisions[line.id]!
    const picked = Math.min(line.ordered, d.picked + 1)
    decide(line.id, { picked, outcome: picked === line.ordered ? 'full' : 'short' })
    setScanNote(`${line.product}: ${picked} of ${line.ordered} picked`)
    setScan('')
  }
  const save = () => onRecordPicks?.(decided.map(l => ({ line: l.id, picked: decisions[l.id]!.picked, reason: decisions[l.id]!.reason }))).then(() => setRevisit(false), () => undefined)

  const steps: ThreadStep[] = (['pick', 'pack', 'handover'] as const).map((s, i, all) => {
    const at = step === 'done' ? all.length : all.indexOf(step as (typeof all)[number])
    return { key: s, label: s === 'pick' ? 'Pick' : s === 'pack' ? 'Pack' : 'Hand over', state: i < at ? 'done' : i === at ? 'current' : 'upcoming' }
  })

  return (
    <section className="flex min-w-0 flex-col gap-5" aria-label={`Fulfilment for ${order}`} data-density="compact">
      <div className="grid grid-cols-1 gap-4 border-y border-border py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <span className="font-display text-3xl font-extrabold tabular">{decided.length}<span className="text-muted"> / {lines.length}</span></span>
          <span className="text-sm text-muted">lines decided{buyer ? ` · for ${buyer}` : ''}</span>
        </div>
        <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-md">
          {deliverTo ? <><dt className="text-muted">Deliver to</dt><dd>{deliverTo}</dd></> : null}
          {instructions ? <><dt className="text-muted">Instructions</dt><dd className="whitespace-pre-line">{instructions}</dd></> : null}
        </dl>
      </div>
      {step !== 'cancelled' ? <Thread label="Fulfilment progress" steps={steps} /> : null}
      {error && !Object.keys(error.fields ?? {}).length ? <p role="alert" className="border border-tone-danger bg-tone-danger-bg/60 px-3 py-2.5 text-md">{error.detail}</p> : null}

      {step === 'pick' ? (
        <>
          <form className="flex flex-col gap-1.5" onSubmit={e => { e.preventDefault(); onScan() }}>
            <label htmlFor="scan" className="text-md font-semibold">Scan or type a SKU</label>
            <div className="flex gap-2">
              <Input id="scan" value={scan} onChange={e => setScan(e.target.value)} prefix={<Icon icon={ScanLine} />} autoComplete="off" className="h-12" inputClassName="h-12 font-mono text-base" />
              <Button type="submit" variant="primary" size="lg">Add</Button>
            </div>
            <p className="text-sm text-muted" aria-live="polite">{scanNote || 'Each scan adds one pack to the matching line.'}</p>
          </form>
          <Progress value={decided.length} max={lines.length} label="Lines decided" />
          <ol className="flex flex-col gap-2">
            {lines.map(l => {
              const d = decisions[l.id]!
              const lineError = fieldError(`picks.${l.id}`)
              const shelfShort = l.onShelf != null && l.onShelf < l.ordered
              return (
                <li key={l.id} className={cn('flex flex-col gap-3 border bg-surface p-3', lineError ? 'border-tone-danger' : d.outcome === 'pending' ? 'border-border-strong' : d.outcome === 'full' ? 'border-tone-success' : d.outcome === 'rejected' ? 'border-tone-danger' : 'border-tone-warning')}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-display text-lg font-bold">{l.bin ? `Bay ${l.bin}` : 'No bay recorded'}</span>
                      <span className="font-semibold">{l.ordered} × {l.product}{l.packLabel ? ` · ${l.packLabel}` : ''}</span>
                      <span className="text-sm text-muted"><code className="font-mono">{l.sku}</code>{l.onShelf != null ? ` · ${l.onShelf} on hand` : ''}</span>
                    </div>
                    <Stamp tone={outcomeLook[d.outcome].tone} detail={d.outcome === 'pending' || d.outcome === 'short' ? `${d.picked} of ${l.ordered}` : undefined}>{outcomeLook[d.outcome].label}</Stamp>
                  </div>
                  {d.outcome === 'pending' ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button variant="primary" size="lg" leadingIcon={Check} disabled={shelfShort} title={shelfShort ? 'Fewer on hand than ordered' : undefined} onClick={() => decide(l.id, { picked: l.ordered, outcome: 'full', reason: '' })}>All {l.ordered}</Button>
                      <Button variant="warning-outline" size="lg" onClick={() => decide(l.id, { picked: Math.min(l.ordered - 1, Math.max(1, l.onShelf ?? l.ordered - 1)), outcome: 'short' })}>Part of it</Button>
                      <Button variant="danger-outline" size="lg" onClick={() => decide(l.id, { picked: 0, outcome: 'rejected' })}>None</Button>
                    </div>
                  ) : null}
                  {d.outcome === 'short' ? (
                    <FieldInput field={{ ...pickedField, help: `Between 1 and ${l.ordered - 1}.` }} value={d.picked}
                      onChange={v => { const n = Math.max(0, Math.min(l.ordered, Number(v ?? 0) || 0)); decide(l.id, { picked: n, outcome: n === l.ordered ? 'full' : n === 0 ? 'rejected' : 'short' }) }} />
                  ) : null}
                  {d.outcome === 'short' || d.outcome === 'rejected' ? <FieldInput field={shortReason} value={d.reason} onChange={v => decide(l.id, { reason: String(v ?? '') })} /> : null}
                  {lineError ? <p role="alert" className="text-sm font-medium text-tone-danger">{lineError}</p> : null}
                  {d.outcome !== 'pending' ? <Button variant="ghost" size="sm" className="self-start" onClick={() => decide(l.id, { picked: 0, outcome: 'pending', reason: '' })}>Undo</Button> : null}
                </li>
              )
            })}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="lg" leadingIcon={PackageCheck} disabled={!decided.length || !onRecordPicks} loading={pending === 'record_picks'} loadingLabel="Saving the picks…" onClick={() => void save()}>
              {decided.length < lines.length ? `Save ${decided.length} of ${lines.length} lines` : 'Save the picks'}
            </Button>
            {savedAll && revisit && !changed ? <Button variant="ghost" size="lg" onClick={() => setRevisit(false)}>Back to packing</Button> : null}
          </div>
          {fieldError('picks') ? <p role="alert" className="text-sm font-medium text-tone-danger">{fieldError('picks')}</p> : null}
        </>
      ) : null}

      {step === 'pack' ? (
        <form className="flex flex-col gap-4 border border-border bg-surface p-4" onSubmit={e => { e.preventDefault(); void onPack?.(Object.fromEntries(PACK.map(n => [n, values[n] ?? null]))).catch(() => undefined) }}>
          <p className="text-md">
            Pack {lines.filter(l => decisions[l.id]!.outcome !== 'rejected').length} of {lines.length} lines.
            {lines.some(l => l.outcome !== 'full') ? ' Packing marks the order partly fulfilled; the buyer is refunded for what was not picked when it is handed over.' : ''}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PACK.map(n => <FieldInput key={n} field={field(n)} value={values[n] ?? null} error={fieldError(n)} onChange={v => setValues(s => ({ ...s, [n]: v }))} />)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" size="lg" leadingIcon={PackageCheck} disabled={!onPack} loading={pending === 'pack'} loadingLabel="Recording…">Packed</Button>
            <Button variant="ghost" size="lg" onClick={() => setRevisit(true)}>Change a pick</Button>
          </div>
        </form>
      ) : null}

      {step === 'handover' ? (
        <form className="flex flex-col gap-4 border border-border bg-surface p-4" onSubmit={e => { e.preventDefault(); void onHandOver?.({ ...Object.fromEntries(HANDOVER.map(n => [n, values[n] ?? null])), evidence_file: values.evidence_file ?? null }).catch(() => undefined) }}>
          <p className="text-md">Hand the packages to the carrier. The photo is kept with the order; the buyer can open it.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {HANDOVER.map(n => <FieldInput key={n} field={n === 'carrier_name' ? { ...field(n), required: true } : field(n)} value={values[n] ?? null} error={fieldError(n)} onChange={v => setValues(s => ({ ...s, [n]: v }))} />)}
          </div>
          <FieldInput field={evidenceField} value={values.evidence_file ?? null} error={fieldError('evidence_file')} onChange={v => setValues(s => ({ ...s, evidence_file: v as FileValue | null }))} />
          <Button type="submit" variant="primary" size="lg" leadingIcon={Truck} disabled={!values.evidence_file || !values.carrier_name || !onHandOver} loading={pending === 'hand_over'} loadingLabel="Handing over…">
            {values.evidence_file ? 'Confirm hand-over' : 'Add the handover photo to confirm'}
          </Button>
        </form>
      ) : null}

      {step === 'done' ? (
        <div className="flex flex-col gap-3 border border-tone-success bg-surface p-4">
          <p className="font-display text-xl font-bold">Handed over</p>
          <p className="text-md">The order is shipped and the buyer follows the delivery on their order. {lines.some(l => l.outcome !== 'full') ? 'Packs not picked went back to available stock and were refunded.' : ''}</p>
          {evidence ? <span className="flex flex-wrap items-center gap-2 text-md"><span className="font-semibold">Handover photo</span><FileView field={evidenceField} value={evidence} /></span> : null}
        </div>
      ) : null}

      {step === 'cancelled' ? <p className="border border-border bg-sunken/60 px-3 py-2.5 text-md">The order was cancelled, so this pick list is closed. Any packs it held went back to available stock.</p> : null}
    </section>
  )
}
