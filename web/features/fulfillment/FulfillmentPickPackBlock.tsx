'use client'

// Divergent (spec p.55): warehouse picking is a scanner-driven task flow with per-line decisions
// (full, short, substitute, reject), large touch targets and one primary action at a time. It
// reuses the kernel's field inputs and the Thread primitive, but its sequence is bespoke.

import { Check, PackageCheck, ScanLine, Truck } from 'lucide-react'
import { useRef, useState } from 'react'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import type { FileValue } from '@/components/kernel/fields/types'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/choice'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Stamp } from '@/components/ui/stamp'
import { Thread } from '@/components/ui/thread'
import { cn } from '@/lib/cn'
import type { FieldMeta } from '@/lib/contract/types'

export type PickLine = { id: string; bin: string; product: string; sku: string; barcode: string; ordered: number; unit: string; onShelf: number; substitutable?: string }
type Decision = { picked: number; outcome: 'pending' | 'full' | 'short' | 'substitute' | 'reject'; reason?: string }
type Mode = 'pick' | 'pack' | 'handover'

// Mirrors FulfillmentLine.short_ship_reason in the field specification (SM-F-16).
const shortReason: FieldMeta = { name: 'short_ship_reason', type: 'text', widget: 'textarea', label: 'Why is this short?', required: true, maxLength: 300 }
const evidenceField: FieldMeta = { name: 'handover_evidence', type: 'file', widget: 'file', label: 'Handover photo', accept: ['image/jpeg', 'image/png'], maxBytes: 10_485_760, help: 'Photo of the loaded goods with the delivery note.' }

const outcomeLook = {
  pending: { tone: 'neutral', label: 'To pick' }, full: { tone: 'success', label: 'Picked' }, short: { tone: 'warning', label: 'Short' },
  substitute: { tone: 'info', label: 'Substituted' }, reject: { tone: 'danger', label: 'Rejected' },
} as const

export function FulfillmentPickPackBlock({ order, lines, initialMode = 'pick' }: { order: string; lines: readonly PickLine[]; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => Object.fromEntries(lines.map(l => [l.id, { picked: 0, outcome: 'pending' }])))
  const [scan, setScan] = useState('')
  const [scanNote, setScanNote] = useState('')
  const [evidence, setEvidence] = useState<FileValue | null>(null)
  const scanRef = useRef<HTMLInputElement>(null)
  const done = lines.filter(l => decisions[l.id]!.outcome !== 'pending').length
  const decide = (id: string, d: Partial<Decision>) => setDecisions(s => ({ ...s, [id]: { ...s[id]!, ...d } }))

  // Scanners type the barcode and press Enter; manual entry works the same way.
  const onScan = () => {
    const line = lines.find(l => l.barcode === scan.trim() || l.sku === scan.trim().toUpperCase())
    if (!line) { setScanNote(`No line on this pick list matches ${scan}. Check the item or enter the SKU.`); setScan(''); return }
    const d = decisions[line.id]!
    const picked = Math.min(line.ordered, d.picked + 1)
    decide(line.id, { picked, outcome: picked === line.ordered ? 'full' : d.outcome })
    setScanNote(`${line.product}: ${picked} of ${line.ordered} picked`)
    setScan('')
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={`Fulfilment for ${order}`} data-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col"><h3 className="font-display text-xl font-bold">{order}</h3><span className="text-sm text-muted tabular">{done} of {lines.length} lines decided</span></div>
        <Segmented label="Step" value={mode} onValueChange={setMode} items={[{ value: 'pick', label: 'Pick' }, { value: 'pack', label: 'Pack' }, { value: 'handover', label: 'Hand over' }]} />
      </div>
      <Thread label="Fulfilment progress" steps={[
        { key: 'pick', label: 'Pick', state: mode === 'pick' ? 'current' : 'done' },
        { key: 'pack', label: 'Pack', state: mode === 'pack' ? 'current' : mode === 'handover' ? 'done' : 'upcoming' },
        { key: 'handover', label: 'Hand over', state: mode === 'handover' ? 'current' : 'upcoming' },
      ]} />
      {mode === 'pick' ? (
        <>
          <form className="flex flex-col gap-1.5" onSubmit={e => { e.preventDefault(); onScan() }}>
            <label htmlFor="scan" className="text-md font-semibold">Scan or type a barcode / SKU</label>
            <div className="flex gap-2">
              <Input id="scan" ref={scanRef} value={scan} onChange={e => setScan(e.target.value)} prefix={<Icon icon={ScanLine} />} inputMode="numeric" autoComplete="off" className="h-12" inputClassName="h-12 font-mono text-base" />
              <Button type="submit" variant="primary" size="lg">Add</Button>
            </div>
            <p className="text-sm text-muted" aria-live="polite">{scanNote || 'Each scan adds one unit to the matching line.'}</p>
          </form>
          <Progress value={done} max={lines.length} label="Lines decided" />
          <ol className="flex flex-col gap-2">
            {lines.map(l => {
              const d = decisions[l.id]!
              const short = l.onShelf < l.ordered
              return (
                <li key={l.id} className={cn('flex flex-col gap-3 rounded-md border bg-surface p-3', d.outcome === 'pending' ? 'border-border-strong' : d.outcome === 'full' ? 'border-tone-success' : d.outcome === 'reject' ? 'border-tone-danger' : 'border-tone-warning')}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-display text-lg font-bold">Bay {l.bin}</span>
                      <span className="font-semibold">{l.ordered} × {l.product}</span>
                      <span className="text-sm text-muted"><code className="font-mono">{l.sku}</code> · {l.onShelf} on shelf{short ? ` · short by ${l.ordered - l.onShelf}` : ''}</span>
                    </div>
                    <Stamp tone={outcomeLook[d.outcome].tone} detail={d.outcome === 'pending' ? `${d.picked} of ${l.ordered}` : undefined}>{outcomeLook[d.outcome].label}</Stamp>
                  </div>
                  {d.outcome === 'pending' ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Button variant="primary" size="lg" leadingIcon={Check} disabled={short} onClick={() => decide(l.id, { picked: l.ordered, outcome: 'full' })}>All {l.ordered}</Button>
                      <Button variant="warning-outline" size="lg" onClick={() => decide(l.id, { picked: l.onShelf, outcome: 'short' })}>Short</Button>
                      <Button variant="secondary" size="lg" disabled={!l.substitutable} title={l.substitutable ? undefined : 'The buyer does not allow substitutes for this line'} onClick={() => decide(l.id, { picked: l.ordered, outcome: 'substitute' })}>Substitute</Button>
                      <Button variant="danger-outline" size="lg" onClick={() => decide(l.id, { picked: 0, outcome: 'reject' })}>Reject</Button>
                    </div>
                  ) : null}
                  {d.outcome === 'short' || d.outcome === 'reject' ? <FieldInput field={shortReason} value={d.reason ?? ''} onChange={v => decide(l.id, { reason: String(v ?? '') })} /> : null}
                  {d.outcome === 'substitute' ? <p className="text-md">Packing <b className="font-semibold">{l.substitutable}</b> instead; the buyer is told before dispatch.</p> : null}
                  {d.outcome !== 'pending' ? <Button variant="ghost" size="sm" className="self-start" onClick={() => decide(l.id, { picked: 0, outcome: 'pending', reason: undefined })}>Undo</Button> : null}
                </li>
              )
            })}
          </ol>
          <Button variant="primary" size="lg" leadingIcon={PackageCheck} disabled={done < lines.length} onClick={() => setMode('pack')}>{done < lines.length ? `Decide ${lines.length - done} more lines` : 'Continue to packing'}</Button>
        </>
      ) : null}
      {mode === 'pack' ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
          <p className="text-md">Pack {lines.filter(l => decisions[l.id]!.outcome !== 'reject').length} lines. Short and substituted lines update the buyer&apos;s order and the stock ledger when you confirm.</p>
          <div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-md font-semibold">Packages<Input inputMode="numeric" defaultValue="6" className="h-12" /></label><label className="flex flex-col gap-1 text-md font-semibold">Total weight<Input inputMode="decimal" defaultValue="312.5" suffix="kg" className="h-12" /></label></div>
          <Button variant="primary" size="lg" onClick={() => setMode('handover')}>Packed, continue to hand-over</Button>
        </div>
      ) : null}
      {mode === 'handover' ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1 text-md font-semibold">Driver<Input defaultValue="Peter Kamau" className="h-12" /></label><label className="flex flex-col gap-1 text-md font-semibold">Vehicle registration<Input defaultValue="KDA 412X" className="h-12 font-mono" /></label></div>
          <FieldInput field={evidenceField} value={evidence} onChange={v => setEvidence(v as FileValue | null)} />
          <Button variant="primary" size="lg" leadingIcon={Truck} disabled={!evidence}>{evidence ? 'Confirm hand-over' : 'Add the handover photo to confirm'}</Button>
        </div>
      ) : null}
    </section>
  )
}
