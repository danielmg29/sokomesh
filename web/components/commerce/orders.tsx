'use client'

import { ExternalLink, FileText, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { ActivityBlock, type ActivityEvent } from '@/components/kernel/blocks/DataBlocks'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import { FileView } from '@/components/kernel/fields/views'
import type { FileValue } from '@/components/kernel/fields/types'
import { RelativeTime } from '@/components/kernel/fields/islands'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { Thread, type ThreadStep } from '@/components/ui/thread'
import type { FieldMeta, Tone } from '@/lib/contract/types'
import { formatDay, formatTime } from '@/lib/format'

export type OrderStatus = 'submitted' | 'confirmed' | 'picking' | 'partially_fulfilled' | 'shipped' | 'delivered' | 'cancelled' | 'disputed'
export const orderLook: Record<OrderStatus, { tone: Tone; label: string; condition?: 'partial' }> = {
  submitted: { tone: 'info', label: 'Submitted' }, confirmed: { tone: 'success', label: 'Confirmed' }, picking: { tone: 'signal', label: 'Picking' },
  partially_fulfilled: { tone: 'warning', label: 'Partially fulfilled', condition: 'partial' }, shipped: { tone: 'info', label: 'Shipped' },
  delivered: { tone: 'success', label: 'Delivered' }, cancelled: { tone: 'neutral', label: 'Cancelled' }, disputed: { tone: 'danger', label: 'Disputed' },
}

export type OrderTransition = { id: string; to: OrderStatus; from?: OrderStatus; at: string; actor: string; reason?: string; reference?: string; certainty?: ActivityEvent['certainty'] }

/** Order lifecycle (SM-F-15): every transition has actor, time and reason. Configured ActivityBlock. */
export function OrderTimelineBlock({ transitions, variant = 'full', now, next }: { transitions: readonly OrderTransition[]; variant?: 'compact' | 'full'; now?: string; next?: string[] }) {
  const events: ActivityEvent[] = [...transitions].reverse().map(t => ({
    id: t.id, at: t.at, kind: t.to, actor: t.actor, reference: t.reference, certainty: t.certainty,
    title: t.from ? `${orderLook[t.to].label}, from ${orderLook[t.from].label.toLowerCase()}` : orderLook[t.to].label,
    detail: t.reason ? <span className="text-muted">{t.reason}</span> : undefined,
  }))
  return (
    <div className="flex flex-col gap-3">
      <ActivityBlock title="Order history" events={events} density={variant === 'compact' ? 'compact' : 'comfortable'} now={now} />
      {next?.length ? <p className="text-sm text-muted">Next possible steps: {next.join(', ')}.</p> : null}
    </div>
  )
}

export type ShipmentStatus = 'pending' | 'handed_over' | 'in_transit' | 'delivered' | 'exception'
export type ShipmentEvent = { id: string; at: string; label: string; location?: string }

/** Delivery tracking (SM-F-17). Late or missing events degrade to a clear last-known state. */
export function DeliveryTrackingBlock({ status, carrier, reference, windowStart, windowEnd, events, delayed, lastEventAt, proofOfDelivery, mapHref, now }: {
  status: ShipmentStatus; carrier: string; reference: string; windowStart: string; windowEnd: string; events: readonly ShipmentEvent[]; delayed?: boolean; lastEventAt?: string
  proofOfDelivery?: FileValue; mapHref?: string; now?: string
}) {
  const order: ShipmentStatus[] = ['pending', 'handed_over', 'in_transit', 'delivered']
  const at = order.indexOf(status)
  const labels: Record<ShipmentStatus, string> = { pending: 'Being prepared', handed_over: 'Handed to carrier', in_transit: 'In transit', delivered: 'Delivered', exception: 'Delivery problem' }
  const steps: ThreadStep[] = order.map((s, i) => ({
    key: s, label: labels[s],
    state: status === 'exception' && i === Math.max(1, at) ? 'failed' : i < at ? 'done' : i === at ? (delayed ? 'stale' : status === 'delivered' ? 'done' : 'current') : 'upcoming',
  }))
  const unknown = !events.length
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label="Delivery">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-lg font-bold">Delivery</h3>
          <span className="text-sm text-muted">{carrier} · <code className="font-mono">{reference}</code></span>
        </div>
        {unknown ? <Stamp tone="neutral" condition="unknown">No tracking yet</Stamp>
          : delayed ? <Stamp tone="warning" condition="pending">Delayed</Stamp>
          : <Stamp tone={status === 'delivered' ? 'success' : status === 'exception' ? 'danger' : 'info'}>{labels[status]}</Stamp>}
      </div>
      <Thread label="Delivery progress" steps={steps} />
      <p className="text-md">
        {status === 'delivered' ? 'Delivered.' : <>Expected {formatDay(windowStart)}, {formatTime(windowStart)} to {formatTime(windowEnd)}.</>}
        {delayed && lastEventAt ? <span className="mt-1 flex items-start gap-1.5 text-tone-warning"><Icon icon={TriangleAlert} className="mt-0.5" />The delivery window has passed. Last update <RelativeTime iso={lastEventAt} now={now} />; the carrier has been asked for a new time.</span> : null}
        {unknown ? <span className="mt-1 block text-muted">The carrier has not sent any updates. The seller confirmed hand-over; this page updates when the first scan arrives.</span> : null}
      </p>
      {events.length ? (
        <ol className="flex flex-col divide-y divide-border rounded-sm border border-border text-md">
          {[...events].reverse().map(e => (
            <li key={e.id} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-3 py-2">
              <span className="text-sm text-muted tabular">{formatDay(e.at)} · {formatTime(e.at)}</span>
              <span>{e.label}{e.location ? <span className="text-muted"> · {e.location}</span> : null}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {proofOfDelivery ? <span className="flex items-center gap-2 text-md"><span className="font-semibold">Proof of delivery</span><FileView field={{ name: 'pod', type: 'file', widget: 'file' }} value={proofOfDelivery} /></span> : null}
        {mapHref ? <a href={mapHref} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-md font-semibold text-primary hover:underline">Open carrier tracking<Icon icon={ExternalLink} /><span className="sr-only"> (opens in a new tab)</span></a> : null}
      </div>
    </section>
  )
}

export type CaseStatus = 'open' | 'evidence_requested' | 'reviewing' | 'approved' | 'rejected' | 'resolved'
export type CaseType = 'return' | 'dispute' | 'damage' | 'shortage' | 'wrong_item' | 'quality_issue'

const caseLook: Record<CaseStatus, { tone: Tone; label: string }> = {
  open: { tone: 'info', label: 'Open' }, evidence_requested: { tone: 'warning', label: 'Evidence requested' }, reviewing: { tone: 'signal', label: 'Under review' },
  approved: { tone: 'success', label: 'Approved' }, rejected: { tone: 'danger', label: 'Rejected' }, resolved: { tone: 'neutral', label: 'Resolved' },
}
const caseTypeLabel: Record<CaseType, string> = { return: 'Return', dispute: 'Dispute', damage: 'Damaged goods', shortage: 'Short delivery', wrong_item: 'Wrong item', quality_issue: 'Quality issue' }

// Mirrors ReturnCase.decision / decision_notes / stock_disposition in the field specification (SM-F-18).
const decisionFields: FieldMeta[] = [
  { name: 'decision', type: 'enum', widget: 'select', label: 'Decision', required: true, choices: [
    { value: 'approved', label: 'Approve in full' }, { value: 'partial', label: 'Approve part of the claim' }, { value: 'replacement', label: 'Send a replacement' }, { value: 'rejected', label: 'Reject' },
  ] },
  { name: 'stock_disposition', type: 'enum', widget: 'select', label: 'Returned stock', choices: [
    { value: 'restock', label: 'Restock' }, { value: 'quarantine', label: 'Quarantine for inspection' }, { value: 'scrap', label: 'Scrap' }, { value: 'supplier_return', label: 'Return to supplier' }, { value: 'none', label: 'No stock returned' },
  ] },
  { name: 'decision_notes', type: 'text', widget: 'textarea', label: 'Decision explanation', required: true, maxLength: 1000, help: 'Shared with the buyer and kept in the audit trail.' },
]

/** Line-level return or dispute (SM-F-18): reason, evidence, decision; refund and stock stay separately auditable. */
export function ReturnDisputeCaseBlock({ reference, type, status, line, reason, evidence, canDecide, now, openedAt }: {
  reference: string; type: CaseType; status: CaseStatus; line: string; reason: string; evidence: readonly FileValue[]; canDecide?: boolean; now?: string; openedAt: string
}) {
  const [values, setValues] = useState<Record<string, unknown>>({ decision: null, stock_disposition: null, decision_notes: '' })
  const order: CaseStatus[] = ['open', 'reviewing', 'resolved']
  const idx = status === 'evidence_requested' ? 0 : status === 'approved' || status === 'rejected' ? 1 : order.indexOf(status)
  const steps: ThreadStep[] = order.map((s, i) => ({ key: s, label: caseLook[s].label, state: i < idx ? 'done' : i === idx ? (status === 'evidence_requested' ? 'stale' : status === 'resolved' ? 'done' : 'current') : 'upcoming' }))
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label={`Case ${reference}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-lg font-bold">{caseTypeLabel[type]} · <code className="font-mono text-md">{reference}</code></h3>
          <span className="text-sm text-muted">{line} · opened <RelativeTime iso={openedAt} now={now} /></span>
        </div>
        <Stamp tone={caseLook[status].tone}>{caseLook[status].label}</Stamp>
      </div>
      <Thread label="Case progress" steps={steps} />
      <div className="flex flex-col gap-1"><span className="caps text-muted">Buyer&apos;s claim</span><p className="text-md whitespace-pre-line">{reason}</p></div>
      <div className="flex flex-col gap-2">
        <span className="caps text-muted">Evidence ({evidence.length})</span>
        {evidence.length ? <ul className="flex flex-col gap-1.5">{evidence.map(f => <li key={f.name}><FileView field={{ name: 'evidence', type: 'file', widget: 'file' }} value={f} /></li>)}</ul>
          : <p className="flex items-center gap-1.5 text-md text-muted"><Icon icon={FileText} />No evidence attached yet.</p>}
        {status === 'evidence_requested' ? <p className="text-sm font-medium text-tone-warning">The seller asked for photos of the damaged bales. The case pauses until they arrive.</p> : null}
      </div>
      {canDecide && (status === 'reviewing' || status === 'open') ? (
        <form className="flex flex-col gap-3 border-t border-border pt-4" onSubmit={e => e.preventDefault()}>
          {decisionFields.map(f => <FieldInput key={f.name} field={f} value={values[f.name]} onChange={v => setValues(s => ({ ...s, [f.name]: v }))} />)}
          <div className="flex flex-wrap gap-2"><Button type="submit" variant="primary">Record decision</Button><Button variant="secondary">Request more evidence</Button></div>
          <p className="text-sm text-muted">Refunds are issued separately by finance through SellaPay and appear in this case&apos;s history.</p>
        </form>
      ) : null}
    </section>
  )
}
