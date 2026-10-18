'use client'

import { ChevronDown, Lock, Minus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import Image from 'next/image'
import { useState, type ReactNode } from 'react'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import { unitLabel } from '@/components/kernel/fields/types'
import { Empty } from '@/components/kernel/fields/views'
import { Button, IconButton } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/disclosure'
import { Sheet } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { Thread, type ThreadStep } from '@/components/ui/thread'
import { cn } from '@/lib/cn'
import type { AppError, FieldMeta, Tone } from '@/lib/contract/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { addMoney, compareMoney, formatMoney, multiplyMoney, percentChange } from '@/lib/money'
import { StockAvailabilityIndicator } from './stock'
import type { CartLine, Money, SellerGroup } from './types'

const qtyText = (n: number, unit: string) => `${n.toLocaleString('en-KE')} ${unitLabel(unit, n) ?? unit}`
export const lineTotal = (l: CartLine) => multiplyMoney(l.unitPrice, l.quantity)
export const groupSubtotal = (g: SellerGroup) => addMoney(...g.lines.filter(l => l.state !== 'unavailable').map(lineTotal), '0')

function LineStepper({ line, onQuantity, disabled }: { line: CartLine; onQuantity?: (n: number) => void; disabled?: boolean }) {
  const step = line.step ?? 1
  const min = line.moq ?? step
  const max = line.stock.available + (line.stock.heldForYou ?? 0)
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Quantity of ${line.product}`}>
      <IconButton icon={Minus} label={`Remove ${step} ${unitLabel(line.unit, step)}`} size="icon-sm" variant="secondary" disabled={disabled || line.quantity - step < min} onClick={() => onQuantity?.(line.quantity - step)} />
      <output className="min-w-16 text-center font-semibold tabular" aria-live="polite">{line.quantity}</output>
      <IconButton icon={Plus} label={`Add ${step} ${unitLabel(line.unit, step)}`} size="icon-sm" variant="secondary" disabled={disabled || line.quantity + step > max} onClick={() => onQuantity?.(line.quantity + step)} />
    </div>
  )
}

/** One seller's part of a mixed cart: lines validated seller by seller. */
export function SellerCartGroup({ group, defaultOpen = true, onQuantity, onRemove, actions }: { group: SellerGroup; defaultOpen?: boolean; onQuantity?: (lineId: string, n: number) => void; onRemove?: (lineId: string) => void; actions?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  const subtotal = groupSubtotal(group)
  const belowMinimum = group.minimumOrder && compareMoney(subtotal, group.minimumOrder) < 0
  const changed = group.lines.filter(l => l.state === 'changed').length
  const unavailable = group.lines.filter(l => l.state === 'unavailable').length
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section className="rounded-md border border-border bg-surface" aria-label={`Lines from ${group.seller}`}>
        <CollapsibleTrigger className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-sunken/60">
          <span className="flex min-w-0 flex-col">
            <span className="font-display text-lg font-bold">{group.seller}</span>
            <span className="text-sm text-muted">{group.location}{group.dispatch ? ` · dispatches ${group.dispatch}` : ''} · {group.lines.length} {group.lines.length === 1 ? 'line' : 'lines'}</span>
          </span>
          <span className="flex items-center gap-3">
            {changed ? <Stamp tone="warning" size="sm">{changed} repriced</Stamp> : null}
            {unavailable ? <Stamp tone="danger" size="sm">{unavailable} unavailable</Stamp> : null}
            <span className="font-semibold tabular">{formatMoney(subtotal)}</span>
            <Icon icon={ChevronDown} className={cn('text-muted motion-reveal transition-transform', open && 'rotate-180')} />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {group.lines.map(l => (
              <li key={l.id} className={cn('grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_8.5rem]', l.state === 'unavailable' && 'bg-sunken/60')}>
                {l.image ? <Image src={l.image.url} alt="" width={56} height={56} className="size-14 rounded-sm border border-border bg-well object-contain p-1" /> : <span className="size-14 rounded-sm bg-well" />}
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={cn('font-semibold', l.state === 'unavailable' && 'text-muted line-through')}>{l.product}</span>
                  <span className="text-sm text-muted">{l.variant ? `${l.variant} · ` : ''}<code className="font-mono">{l.sku}</code>{l.moq ? ` · MOQ ${qtyText(l.moq, l.unit)}` : ''}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StockAvailabilityIndicator stock={l.stock} />
                    {l.state === 'changed' && l.previousUnitPrice ? <Stamp tone="warning" size="sm" detail={`was ${formatMoney(l.previousUnitPrice)}, now ${formatMoney(l.unitPrice)} (${percentChange(l.previousUnitPrice, l.unitPrice)})`}>Repriced</Stamp> : null}
                  </span>
                  {l.reason ? <span className="text-sm text-tone-danger">{l.reason}</span> : null}
                </div>
                <div className="col-start-2 flex items-center gap-2 sm:col-start-auto">
                  {l.state === 'unavailable' ? <span className="text-sm text-muted">Not included</span> : <LineStepper line={l} onQuantity={n => onQuantity?.(l.id, n)} />}
                  <IconButton icon={Trash2} label={`Remove ${l.product}`} size="icon-sm" onClick={() => onRemove?.(l.id)} />
                </div>
                <div className="col-start-2 flex flex-col sm:col-start-auto sm:items-end">
                  <span className="font-semibold tabular">{l.state === 'unavailable' ? <Empty label="Not in the total" /> : formatMoney(lineTotal(l))}</span>
                  <span className="text-sm text-muted tabular">{formatMoney(l.unitPrice)} / {l.unit}</span>
                  {l.priceNote ? <span className="text-sm text-muted">{l.priceNote}</span> : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1 border-t border-border px-4 py-3 text-md">
            <div className="flex justify-between"><span className="text-muted">Delivery from {group.seller}</span><span className="tabular">{group.deliveryFee ? formatMoney(group.deliveryFee) : <span className="text-muted">Confirmed at checkout</span>}</span></div>
            {belowMinimum ? <p className="flex items-center gap-1.5 text-sm font-medium text-tone-warning"><Icon icon={TriangleAlert} />Add {formatMoney(addMoney(group.minimumOrder!, `-${subtotal}`))} more to reach this seller&apos;s minimum order of {formatMoney(group.minimumOrder!)}.</p> : null}
            {actions ? <div className="flex flex-wrap justify-end gap-2 pt-1">{actions}</div> : null}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

export type CartState = 'valid' | 'repricing' | 'out-of-stock' | 'approval-needed'

/**
 * Server-backed mixed-seller cart. Repricing is explicit: the banner offers to accept the new prices
 * (`onAcceptPrices`). Checkout explains why it is blocked, including `checkoutBlockedReason` from the page.
 * `groupActions` adds controls to one seller's part (a quote request goes to one seller).
 */
export function CartBlock({ groups, state, approvalThreshold, onCheckout, onRequestApproval, onRequestQuote, onQuantity, onRemove, onAcceptPrices, accepting, checkoutBlockedReason, submitting, groupActions }: {
  groups: readonly SellerGroup[]; state: CartState; approvalThreshold?: Money; onCheckout?: () => void; onRequestApproval?: () => void; onRequestQuote?: () => void
  onQuantity?: (lineId: string, n: number) => void; onRemove?: (lineId: string) => void; onAcceptPrices?: () => void; accepting?: boolean
  checkoutBlockedReason?: string; submitting?: boolean; groupActions?: (group: SellerGroup) => ReactNode
}) {
  const subtotal = addMoney(...groups.map(groupSubtotal), '0')
  const fees = groups.flatMap(g => (g.deliveryFee ? [g.deliveryFee] : []))
  const priced = fees.length === groups.length
  const delivery = addMoney(...fees, '0')
  const total = addMoney(subtotal, delivery)
  const banner: Partial<Record<CartState, { tone: string; text: ReactNode }>> = {
    repricing: { tone: 'border-tone-warning bg-tone-warning-bg/60', text: 'Some prices changed since you added these lines. The new prices apply; review them before checkout.' },
    'out-of-stock': { tone: 'border-tone-danger bg-tone-danger-bg/60', text: 'Some lines are no longer available. They are left out of the total; remove them or request a quote for later supply.' },
    'approval-needed': { tone: 'border-tone-info bg-tone-info-bg/60', text: <>Orders over {approvalThreshold ? formatMoney(approvalThreshold) : 'your limit'} wait for a colleague&apos;s approval before they are sent to sellers.</> },
  }
  const blocked = state === 'out-of-stock' || Boolean(checkoutBlockedReason)
  return (
    <div className="grid grid-cols-1 gap-6 @container lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-3">
        {banner[state] ? (
          <div role="status" className={cn('flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-md', banner[state]!.tone)}>
            <span className="min-w-0 flex-1">{banner[state]!.text}</span>
            {state === 'repricing' && onAcceptPrices ? <Button variant="secondary" size="sm" loading={accepting} loadingLabel="Accepting…" onClick={onAcceptPrices}>Accept new prices</Button> : null}
          </div>
        ) : null}
        {groups.map(g => <SellerCartGroup key={g.sellerId} group={g} onQuantity={onQuantity} onRemove={onRemove} actions={groupActions?.(g)} />)}
      </div>
      <aside className="flex h-fit flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:sticky lg:top-4" aria-label="Cart summary">
        <h3 className="font-display text-xl font-bold">Summary</h3>
        <dl className="flex flex-col gap-1.5 text-md">
          {groups.map(g => (
            <div key={g.sellerId} className="flex justify-between gap-3"><dt className="truncate text-muted">{g.seller}</dt><dd className="tabular">{formatMoney(groupSubtotal(g))}</dd></div>
          ))}
          <div className="flex justify-between gap-3"><dt className="text-muted">Delivery ({groups.length} {groups.length === 1 ? 'seller' : 'sellers'})</dt><dd className="tabular">{priced ? formatMoney(delivery) : <span className="text-muted">At checkout</span>}</dd></div>
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-3"><dt className="font-semibold">{priced ? 'Total' : 'Goods total'}</dt><dd className="font-display text-2xl font-extrabold tabular">{formatMoney(total)}</dd></div>
        </dl>
        <p className="text-sm text-muted">Prices, minimum orders and stock are checked again when you place the order. Each seller confirms and ships their own part.</p>
        {state === 'approval-needed' ? (
          <Button variant="primary" size="lg" block onClick={onRequestApproval}>Check out for approval</Button>
        ) : (
          <Button variant="primary" size="lg" block disabled={blocked} loading={submitting} loadingLabel="Checking…" onClick={onCheckout} aria-describedby={blocked ? 'cart-blocked' : undefined}>Check out</Button>
        )}
        {blocked ? <p id="cart-blocked" className={cn('flex items-start gap-1.5 text-sm', state === 'out-of-stock' ? 'text-tone-danger' : 'text-muted')}><Icon icon={Lock} className="mt-0.5 shrink-0" />{state === 'out-of-stock' ? 'Remove unavailable lines to continue.' : checkoutBlockedReason}</p> : null}
        {onRequestQuote ? <Button variant="secondary" block onClick={onRequestQuote}>Request a quote instead</Button> : null}
      </aside>
    </div>
  )
}

export type QuoteStatus = 'draft' | 'requested' | 'responded' | 'accepted' | 'declined' | 'expired' | 'cancelled'

const quoteLook: Record<QuoteStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' }, requested: { tone: 'info', label: 'Requested' }, responded: { tone: 'signal', label: 'Seller responded' },
  accepted: { tone: 'success', label: 'Accepted' }, declined: { tone: 'danger', label: 'Declined' }, expired: { tone: 'neutral', label: 'Expired' }, cancelled: { tone: 'neutral', label: 'Cancelled' },
}

export type QuoteLineView = { id: string; product: string; quantity: number; unit: string; listPrice: Money; offeredPrice?: Money }

export type QuoteOutcome = { ok: true } | { ok: false; error: AppError }
type Option = { value: string; label: string; description?: string }

/**
 * Buyer quote request (SM-F-11) for one seller's cart lines: create, or view with its status thread. The
 * form's fields are the quote model's from the contract (`fields`); the API's answer is shown in place.
 */
export function QuoteRequestSheet({ mode, status, seller, lines, fields, initial, options, trigger, onSubmit, reference, expiresAt, open, onOpenChange }: {
  mode: 'create' | 'revise' | 'view'; status: QuoteStatus; seller: string; lines: readonly QuoteLineView[]; fields: readonly FieldMeta[]
  initial?: Record<string, unknown>; options?: Record<string, Option[]>; trigger?: ReactNode; reference?: string; expiresAt?: string
  onSubmit?: (values: Record<string, unknown>) => Promise<QuoteOutcome> | void; open?: boolean; onOpenChange?: (open: boolean) => void
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map(f => [f.name, initial?.[f.name] ?? null])))
  const [error, setError] = useState<AppError | null>(null)
  const [pending, setPending] = useState(false)
  const steps: ThreadStep[] = (['requested', 'responded', 'accepted'] as const).map((s, i) => {
    const order = ['draft', 'requested', 'responded', 'accepted']
    const at = order.indexOf(status)
    const failed = status === 'declined' || status === 'expired' || status === 'cancelled'
    return { key: s, label: quoteLook[s].label, state: failed && i === 1 ? 'failed' : at > i + 1 ? 'done' : at === i + 1 ? 'current' : 'upcoming' }
  })
  const editable = mode !== 'view'
  const submit = async () => {
    setPending(true)
    setError(null)
    const out = await onSubmit?.(values)
    setPending(false)
    if (out && !out.ok) setError(out.error)
  }
  return (
    <Sheet
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      width="lg"
      title={mode === 'create' ? `Request a quote from ${seller}` : mode === 'revise' ? 'Revise quote request' : `Quote ${reference ?? ''}`}
      description={<span className="inline-flex items-center gap-2">Status <Stamp tone={quoteLook[status].tone} size="sm">{quoteLook[status].label}</Stamp></span>}
      footer={editable ? <Button variant="primary" loading={pending} loadingLabel="Sending…" onClick={() => void submit()}>{mode === 'create' ? 'Send quote request' : 'Send revision'}</Button> : null}
    >
      <div className="flex flex-col gap-6">
        <Thread label="Quote progress" steps={steps} />
        <section className="flex flex-col gap-2" aria-label="Lines">
          <h3 className="font-sans text-md font-semibold">Lines</h3>
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
            {lines.map(l => (
              <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2.5">
                <span><b className="font-semibold">{qtyText(l.quantity, l.unit)}</b> · {l.product}</span>
                <span className="text-sm tabular">
                  <span className={cn(l.offeredPrice && 'text-muted line-through')}>List {formatMoney(l.listPrice)}</span>
                  {l.offeredPrice ? <span className="ml-2 font-semibold">Offered {formatMoney(l.offeredPrice)}</span> : null}
                  <span className="text-muted"> / {l.unit}</span>
                </span>
              </li>
            ))}
          </ul>
          {mode === 'create' ? <p className="text-sm text-muted">These lines leave your cart and wait in the quote; accepting the seller&apos;s offer places the order at the offered prices.</p> : null}
        </section>
        {error && !Object.keys(error.fields).length ? <p role="alert" className="rounded-sm border border-tone-danger bg-tone-danger-bg/60 px-3 py-2 text-md text-tone-danger">{error.detail}</p> : null}
        {editable ? fields.map(f => (
          <FieldInput key={f.name} field={f} value={values[f.name]} error={error?.fields[f.name]?.[0]} onChange={v => setValues(s => ({ ...s, [f.name]: v }))} options={options?.[f.name]} />
        )) : expiresAt ? <p className="text-md text-muted">Valid until {formatDateTime(expiresAt)}.</p> : null}
      </div>
    </Sheet>
  )
}

export type QuoteDecision = 'accept' | 'counter' | 'decline'

/**
 * Seller response (accept, counter, decline). An accepted quote becomes an immutable order input.
 * `notesField` (the quote's seller notes, from the contract) is sent with the decision; declining needs it.
 */
export function QuoteDecisionPanel({ reference, buyer, lines, expiresAt, accepted, onDecide, notesField, pending = null, error }: {
  reference: string; buyer: string; lines: readonly QuoteLineView[]; expiresAt: string; accepted?: { at: string; total: Money }
  onDecide?: (decision: QuoteDecision, offers: Record<string, string>, notes: string) => void; notesField?: FieldMeta; pending?: QuoteDecision | null; error?: string
}) {
  const [offers, setOffers] = useState<Record<string, string>>(() => Object.fromEntries(lines.map(l => [l.id, l.offeredPrice ?? l.listPrice])))
  const [notes, setNotes] = useState('')
  const total = addMoney(...lines.map(l => multiplyMoney(offers[l.id] ?? l.listPrice, l.quantity)))
  const listTotal = addMoney(...lines.map(l => multiplyMoney(l.listPrice, l.quantity)))
  const offerField: FieldMeta = { name: 'offered_price', type: 'decimal', widget: 'currency', label: 'Offer per unit', currency: 'KES', decimalPlaces: 2, maxDigits: 12 }
  if (accepted) {
    return (
      <section className="flex flex-col gap-3 rounded-md border border-tone-success bg-surface p-4" aria-label={`Accepted quote ${reference}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-bold">Quote {reference}</h3><Stamp tone="success" fresh>Accepted</Stamp></div>
        <p className="text-md">Accepted {formatDateTime(accepted.at)} for <b className="font-semibold tabular">{formatMoney(accepted.total)}</b>. These prices are locked into the order and cannot be edited; changes need a new quote.</p>
        <ul className="flex flex-col divide-y divide-border rounded-sm border border-border bg-sunken/50 text-md">
          {lines.map(l => <li key={l.id} className="flex justify-between gap-3 px-3 py-2"><span>{qtyText(l.quantity, l.unit)} · {l.product}</span><span className="tabular">{formatMoney(l.offeredPrice ?? l.listPrice)}</span></li>)}
        </ul>
      </section>
    )
  }
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label={`Respond to quote ${reference}`}>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-bold">Quote {reference} · {buyer}</h3>
        <p className="text-sm text-muted">Respond before {formatDateTime(expiresAt)}. Offers are per unit and exclude delivery.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {lines.map(l => (
          <li key={l.id} className="grid grid-cols-1 items-end gap-2 border-b border-border pb-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="flex flex-col"><span className="font-semibold">{qtyText(l.quantity, l.unit)} · {l.product}</span><span className="text-sm text-muted tabular">List price {formatMoney(l.listPrice)} / {l.unit}</span></div>
            <FieldInput field={{ ...offerField, label: `Offer per ${l.unit}` }} value={offers[l.id]} onChange={v => setOffers(o => ({ ...o, [l.id]: String(v ?? '') }))} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-md"><span className="text-muted">List total {formatMoney(listTotal)}</span><span className="font-semibold">Your offer <span className="font-display text-xl tabular">{formatMoney(total)}</span> ({percentChange(listTotal, total)})</span></div>
      {notesField ? <FieldInput field={notesField} value={notes} onChange={v => setNotes(String(v ?? ''))} mirror={false} /> : null}
      {error ? <p role="alert" className="rounded-sm border border-tone-danger bg-tone-danger-bg/60 px-3 py-2 text-md text-tone-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={pending !== null} loading={pending === 'accept'} loadingLabel="Sending…" onClick={() => onDecide?.('accept', Object.fromEntries(lines.map(l => [l.id, l.listPrice])), notes)}>Offer list prices</Button>
        <Button variant="signal" disabled={pending !== null} loading={pending === 'counter'} loadingLabel="Sending…" onClick={() => onDecide?.('counter', offers, notes)}>Send counter-offer</Button>
        <Button variant="danger-outline" disabled={pending !== null || (Boolean(notesField) && !notes.trim())} loading={pending === 'decline'} loadingLabel="Declining…" onClick={() => onDecide?.('decline', offers, notes)}>Decline</Button>
      </div>
      {notesField ? <p className="text-sm text-muted">The buyer reads your notes; declining needs a reason.</p> : null}
    </section>
  )
}

export type ApprovalStep = { level: number; role: string; approver?: string; decision?: 'approved' | 'rejected'; comment?: string; decidedAt?: string }

/**
 * Buyer purchase approval (SM-F-12): the API also refuses orders that skip it. `waiting` tells someone who
 * cannot decide who can; `commentField` is the decision comment from the contract when the page has it.
 */
export function ApprovalFlowBlock({ state, policyName, threshold, orderTotal, steps, canDecide, onDecide, waiting, commentField: given, pending = null }: {
  state: 'not-required' | 'pending' | 'approved' | 'rejected'; policyName: string; threshold: Money; orderTotal: Money; steps: readonly ApprovalStep[]; canDecide?: boolean
  onDecide?: (decision: 'approved' | 'rejected', comment: string) => void; waiting?: string; commentField?: FieldMeta; pending?: 'approved' | 'rejected' | null
}) {
  const [comment, setComment] = useState('')
  const look: Record<typeof state, { tone: Tone; label: string }> = {
    'not-required': { tone: 'neutral', label: 'No approval needed' }, pending: { tone: 'info', label: 'Awaiting approval' }, approved: { tone: 'success', label: 'Approved' }, rejected: { tone: 'danger', label: 'Rejected' },
  }
  const thread: ThreadStep[] = steps.map((s, i) => ({
    key: String(s.level),
    label: `Level ${s.level} · ${s.role}`,
    detail: s.decision ? `${s.approver} · ${s.decision} ${s.decidedAt ? formatDate(s.decidedAt) : ''}${s.comment ? ` · "${s.comment}"` : ''}` : s.approver ?? 'Any approver with this role',
    state: s.decision === 'approved' ? 'done' : s.decision === 'rejected' ? 'failed' : steps.slice(0, i).every(p => p.decision === 'approved') && state === 'pending' ? 'current' : 'upcoming',
  }))
  const commentField: FieldMeta = given ?? { name: 'comment', type: 'text', widget: 'textarea', label: 'Decision reason', maxLength: 500, help: 'Required to reject; kept in the order history.' }
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label="Purchase approval">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">Purchase approval</h3>
        <Stamp tone={look[state].tone} condition={state === 'pending' ? 'pending' : undefined}>{look[state].label}</Stamp>
      </div>
      <p className="text-md text-muted">{policyName}: orders of {formatMoney(threshold)} or more need approval. This order is {formatMoney(orderTotal)}.</p>
      {state !== 'not-required' ? <Thread orientation="vertical" label="Approval steps" steps={thread} /> : null}
      {state === 'pending' && canDecide ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <FieldInput field={commentField} value={comment} onChange={v => setComment(String(v ?? ''))} mirror={false} />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={pending !== null} loading={pending === 'approved'} loadingLabel="Approving…" onClick={() => onDecide?.('approved', comment)}>Approve order</Button>
            <Button variant="danger-outline" disabled={pending !== null || !comment.trim()} loading={pending === 'rejected'} loadingLabel="Rejecting…" onClick={() => onDecide?.('rejected', comment)}>Reject with reason</Button>
          </div>
        </div>
      ) : null}
      {state === 'pending' && !canDecide ? <p className="flex items-center gap-1.5 text-sm text-muted"><Icon icon={Lock} />{waiting ?? 'Only a buyer owner can approve. You will be notified when they decide.'}</p> : null}
    </section>
  )
}
