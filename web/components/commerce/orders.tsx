'use client'

import { ExternalLink, FileText, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { ActivityBlock, type ActivityEvent } from '@/components/kernel/blocks/DataBlocks'
import { FileView } from '@/components/kernel/fields/views'
import type { FileValue } from '@/components/kernel/fields/types'
import { RelativeTime } from '@/components/kernel/fields/islands'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { Thread, type ThreadStep } from '@/components/ui/thread'
import { OrderMeta, ReturnCaseMeta } from '@/lib/contract/generated'
import type { Choice, FieldMeta, Tone } from '@/lib/contract/types'
import { formatDay, formatTime } from '@/lib/format'
import { formatMoney } from '@/lib/money'

export type OrderStatus = 'pending_approval' | 'awaiting_payment' | 'submitted' | 'confirmed' | 'picking' | 'partially_fulfilled' | 'shipped' | 'delivered' | 'cancelled' | 'disputed'
// Labels and tones are the backend's (Order.status choices in the contract); only the stamp condition is ours.
const statusChoices: readonly Choice[] = OrderMeta.fields.find(f => f.name === 'status')?.choices ?? []
export const orderLook = Object.fromEntries(
  statusChoices.map(c => [c.value, { tone: c.tone ?? 'neutral', label: c.label, condition: c.value === 'partially_fulfilled' ? 'partial' : undefined }]),
) as Record<OrderStatus, { tone: Tone; label: string; condition?: 'partial' }>

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

/**
 * Delivery tracking (SM-F-17). Late or missing events degrade to a clear last-known state: `delayed` when
 * the window passed or the carrier reported a delay, `stale` when no news arrived for the backend's limit.
 */
export function DeliveryTrackingBlock({ status, carrier, reference, windowStart, windowEnd, events, delayed, stale, lastEventAt, proofOfDelivery, mapHref, now, actions }: {
  status: ShipmentStatus; carrier: string; reference: string; windowStart?: string; windowEnd?: string; events: readonly ShipmentEvent[]; delayed?: boolean; stale?: boolean; lastEventAt?: string
  proofOfDelivery?: FileValue; mapHref?: string; now?: string; actions?: ReactNode
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
          <span className="text-sm text-muted">{carrier}{reference ? <> · <code className="font-mono">{reference}</code></> : null}</span>
        </div>
        {unknown ? <Stamp tone="neutral" condition="unknown">No tracking yet</Stamp>
          : delayed ? <Stamp tone="warning" condition="pending">Delayed</Stamp>
          : <Stamp tone={status === 'delivered' ? 'success' : status === 'exception' ? 'danger' : 'info'}>{labels[status]}</Stamp>}
      </div>
      <Thread label="Delivery progress" steps={steps} />
      <p className="text-md">
        {status === 'delivered' ? 'Delivered.'
          : windowStart && windowEnd ? (formatDay(windowStart) === formatDay(windowEnd)
            ? <>Expected {formatDay(windowStart)}, {formatTime(windowStart)} to {formatTime(windowEnd)}.</>
            : <>Expected between {formatDay(windowStart)}, {formatTime(windowStart)} and {formatDay(windowEnd)}, {formatTime(windowEnd)}.</>)
          : windowEnd ? <>Expected by {formatDay(windowEnd)}, {formatTime(windowEnd)}.</>
          : 'The seller has not given a delivery time yet.'}
        {delayed && lastEventAt ? <span className="mt-1 flex items-start gap-1.5 text-tone-warning"><Icon icon={TriangleAlert} className="mt-0.5" />Running late. Last update <RelativeTime iso={lastEventAt} now={now} />.</span> : null}
        {stale && !delayed && lastEventAt ? <span className="mt-1 flex items-start gap-1.5 text-muted"><Icon icon={TriangleAlert} className="mt-0.5" />No news since <RelativeTime iso={lastEventAt} now={now} />; this is the last known state.</span> : null}
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
        {actions ? <div className="ml-auto">{actions}</div> : null}
      </div>
    </section>
  )
}

export type CaseStatus = 'open' | 'evidence_requested' | 'reviewing' | 'approved' | 'rejected' | 'resolved'
export type CaseType = 'return' | 'dispute' | 'damage' | 'shortage' | 'wrong_item' | 'quality_issue'
/** A photo or document on a case, with who added it and why. */
export type CaseEvidence = FileValue & { note?: string; side?: 'buyer' | 'seller'; addedAt?: string }
/** The seller's decision as recorded: what was accepted, refunded and done with the stock. */
export type CaseDecision = { label: string; notes?: string; approvedQuantity?: number | null; unit?: string; disposition?: string; refund?: string; refunded?: string; decidedAt?: string }

// Labels and tones are the backend's (ReturnCase choices in the contract).
const caseChoice = (name: string, value: string) => (ReturnCaseMeta.fields as readonly FieldMeta[]).find(f => f.name === name)?.choices?.find(c => c.value === value)
const caseStatusLook = (s: CaseStatus) => ({ tone: (caseChoice('status', s)?.tone ?? 'neutral') as Tone, label: caseChoice('status', s)?.label ?? s })

/**
 * Line-level return or dispute (SM-F-18): the claim, its evidence, and the decision with its refund and
 * stock outcome. The commands (ask for evidence, add evidence, decide, withdraw) are the caller's `actions`,
 * from the case's own `_can`; this block never decides who may do what.
 */
export function ReturnDisputeCaseBlock({ reference, type, status, line, reason, evidence, now, openedAt, evidenceNote, decision, windowCloses, windowOpen = true, parties, actions }: {
  reference: string; type: CaseType; status: CaseStatus; line: string; reason: string; evidence: readonly CaseEvidence[]; now?: string; openedAt: string
  evidenceNote?: string; decision?: CaseDecision; windowCloses?: string
  /** Whether claims are still accepted; the line about the window shows only while they are. */
  windowOpen?: boolean; parties?: { buyer: string; seller: string }; actions?: ReactNode
}) {
  const order: CaseStatus[] = ['open', 'reviewing', 'resolved']
  const idx = status === 'evidence_requested' ? 0 : status === 'approved' || status === 'rejected' ? 2 : order.indexOf(status)
  const closed = status === 'resolved' || status === 'rejected' || status === 'approved'
  const steps: ThreadStep[] = order.map((s, i) => ({
    key: s,
    label: i === 2 && status === 'rejected' ? caseStatusLook('rejected').label : caseStatusLook(s).label,
    state: i < idx ? 'done' : i === idx ? (status === 'evidence_requested' ? 'stale' : closed ? (status === 'rejected' ? 'failed' : 'done') : 'current') : 'upcoming',
  }))
  const look = caseStatusLook(status)
  return (
    <section className="flex flex-col gap-5 border border-border bg-surface p-4" aria-label={`Case ${reference}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-lg font-bold">{caseChoice('case_type', type)?.label ?? type} · <code className="font-mono text-md">{reference}</code></h3>
          <span className="text-sm text-muted">{line} · opened <RelativeTime iso={openedAt} now={now} />{parties ? ` · ${parties.buyer} and ${parties.seller}` : ''}</span>
        </div>
        <Stamp tone={look.tone}>{look.label}</Stamp>
      </div>
      <Thread label="Case progress" steps={steps} />
      <div className="flex flex-col gap-1"><span className="caps text-muted">Buyer&apos;s claim</span><p className="text-md whitespace-pre-line">{reason}</p></div>
      <div className="flex flex-col gap-2">
        <span className="caps text-muted">Evidence ({evidence.length})</span>
        {evidence.length ? (
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {evidence.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex flex-col gap-1 py-2">
                <FileView field={{ name: 'evidence', type: 'file', widget: 'file' }} value={f} />
                {f.note || f.side ? <span className="text-sm text-muted">{f.side ? (f.side === 'buyer' ? 'From the buyer' : 'From the seller') : ''}{f.addedAt ? <>, <RelativeTime iso={f.addedAt} now={now} /></> : null}{f.note ? `: ${f.note}` : ''}</span> : null}
              </li>
            ))}
          </ul>
        ) : <p className="flex items-center gap-1.5 text-md text-muted"><Icon icon={FileText} />No evidence attached yet.</p>}
        {status === 'evidence_requested' ? <p className="text-sm font-medium text-tone-warning">The seller asked: {evidenceNote || 'more evidence'}. The case waits until it is added.</p> : null}
      </div>
      {decision ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="caps text-muted">Decision</span>
          <p className="font-display text-xl font-bold">{decision.label}{decision.approvedQuantity ? `: ${decision.approvedQuantity} ${decision.unit ?? ''}`.trimEnd() : ''}</p>
          {decision.notes ? <p className="text-md whitespace-pre-line">{decision.notes}</p> : null}
          <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-md">
            {decision.refund && Number(decision.refund) > 0 ? <><dt className="text-muted">Refund</dt><dd className="tabular">{formatMoney(decision.refund)}{decision.refunded && Number(decision.refunded) >= Number(decision.refund) ? ', returned to the M-Pesa number that paid' : ', due'}</dd></> : null}
            {decision.disposition ? <><dt className="text-muted">Returned stock</dt><dd>{decision.disposition}</dd></> : null}
            {decision.decidedAt ? <><dt className="text-muted">Decided</dt><dd><RelativeTime iso={decision.decidedAt} now={now} /></dd></> : null}
          </dl>
        </div>
      ) : windowCloses && windowOpen && !closed ? <p className="text-sm text-muted">Claims on this order are accepted until {formatDay(windowCloses)}.</p> : null}
      {actions ? <div className="border-t border-border pt-4">{actions}</div> : null}
    </section>
  )
}
