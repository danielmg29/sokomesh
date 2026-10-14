'use client'

import { Lock, Smartphone, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import { CopyValue } from '@/components/kernel/fields/islands'
import { AddressView } from '@/components/kernel/fields/views'
import type { AddressValue } from '@/components/kernel/fields/types'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { Thread, type ThreadStep } from '@/components/ui/thread'
import { cn } from '@/lib/cn'
import type { FieldMeta, Tone } from '@/lib/contract/types'
import { formatDateTime, formatTime, maskPhone, toSellaPayPhone } from '@/lib/format'
import { addMoney, formatMoney } from '@/lib/money'
import type { Money } from './types'

export type CheckoutStep = 'address' | 'review' | 'payment' | 'result'
const stepOrder: CheckoutStep[] = ['address', 'review', 'payment', 'result']
const stepLabel: Record<CheckoutStep, string> = { address: 'Delivery', review: 'Review', payment: 'Payment', result: 'Done' }

export type CheckoutGroup = { seller: string; lines: number; subtotal: Money; deliveryFee: Money; dispatch: string }

/** Buyer checkout frame: steps, per-seller summary and why it may be blocked. */
export function CheckoutSummaryBlock({ step, state, groups, address, blockedReason, children, onContinue, onBack }: {
  step: CheckoutStep; state: 'valid' | 'blocked' | 'submitting'; groups: readonly CheckoutGroup[]; address?: AddressValue; blockedReason?: string; children?: ReactNode; onContinue?: () => void; onBack?: () => void
}) {
  const at = stepOrder.indexOf(step)
  const steps: ThreadStep[] = stepOrder.map((s, i) => ({ key: s, label: stepLabel[s], state: i < at ? 'done' : i === at ? (state === 'blocked' ? 'stale' : 'current') : 'upcoming' }))
  const subtotal = addMoney(...groups.map(g => g.subtotal), '0')
  const delivery = addMoney(...groups.map(g => g.deliveryFee), '0')
  return (
    <div className="flex flex-col gap-5">
      <Thread label="Checkout progress" steps={steps} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
        <aside className="flex h-fit flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label="Order summary">
          <h3 className="font-display text-xl font-bold">Order summary</h3>
          {address ? <div className="flex flex-col gap-1 border-b border-border pb-3 text-md"><span className="caps text-muted">Deliver to</span><AddressView field={{ name: 'address', type: 'address', widget: 'address' }} value={address} /></div> : null}
          <ul className="flex flex-col gap-2 text-md">
            {groups.map(g => (
              <li key={g.seller} className="flex flex-col gap-0.5 border-b border-border pb-2">
                <div className="flex justify-between gap-3"><span className="font-semibold">{g.seller}</span><span className="tabular">{formatMoney(g.subtotal)}</span></div>
                <span className="text-sm text-muted">{g.lines} lines · delivery {formatMoney(g.deliveryFee)} · dispatches {g.dispatch}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 text-md">
            <div className="flex justify-between"><dt className="text-muted">Goods</dt><dd className="tabular">{formatMoney(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular">{formatMoney(delivery)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-border pt-2"><dt className="font-semibold">To pay</dt><dd className="font-display text-2xl font-extrabold tabular">{formatMoney(addMoney(subtotal, delivery))}</dd></div>
          </dl>
          {state === 'blocked' && blockedReason ? <p role="alert" className="flex items-start gap-1.5 rounded-sm border border-tone-warning bg-tone-warning-bg/60 p-2.5 text-sm"><Icon icon={TriangleAlert} className="mt-0.5 text-tone-warning" />{blockedReason}</p> : null}
          {step !== 'result' ? (
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="lg" block disabled={state === 'blocked'} loading={state === 'submitting'} loadingLabel="Submitting…" onClick={onContinue}>
                {step === 'review' ? 'Continue to payment' : step === 'payment' ? 'Send M-Pesa prompt' : 'Continue'}
              </Button>
              {at > 0 ? <Button variant="ghost" block onClick={onBack}>Back</Button> : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export type PaymentState = 'created' | 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'reconciled' | 'stale'

const paymentLook: Record<PaymentState, { tone: Tone; label: string; condition?: 'pending' | 'processing' }> = {
  created: { tone: 'neutral', label: 'Ready to pay' },
  pending: { tone: 'info', label: 'Awaiting approval on phone', condition: 'pending' },
  confirmed: { tone: 'success', label: 'Paid' },
  failed: { tone: 'danger', label: 'Not paid' },
  cancelled: { tone: 'neutral', label: 'Cancelled on phone' },
  reconciled: { tone: 'success', label: 'Reconciled' },
  stale: { tone: 'warning', label: 'Not confirmed yet' },
}

/**
 * Confirmation rule (product owner, 2026-10-13): a payment is confirmed only after the buyer has acted on
 * the M-Pesa prompt on their own phone and the result is a success. Any other outcome (cancelled, wrong
 * PIN, insufficient funds, the prompt expiring, or no result yet) leaves it unconfirmed and the order unpaid.
 */
function confirmationSteps(state: PaymentState, sentAt?: string): ThreadStep[] {
  const sent: ThreadStep = { key: 'sent', label: 'Prompt sent', detail: sentAt ? formatTime(sentAt) : undefined, state: state === 'created' ? 'upcoming' : 'done' }
  const phone: ThreadStep = {
    key: 'phone',
    label: 'Your approval on the phone',
    state: state === 'created' ? 'upcoming' : state === 'pending' ? 'current' : state === 'stale' ? 'stale' : state === 'failed' || state === 'cancelled' ? 'failed' : 'done',
  }
  const result: ThreadStep = { key: 'result', label: 'Confirmed by M-Pesa', state: state === 'confirmed' || state === 'reconciled' ? 'done' : 'upcoming' }
  return [sent, phone, result]
}

const phoneField: FieldMeta = { name: 'phone', type: 'string', widget: 'phone', label: 'M-Pesa number', required: true, help: 'Safaricom number that will receive the payment prompt.' }

/**
 * SellaPay M-Pesa STK push: the prompt goes to the buyer's phone and the API answers "pending". The
 * payment is confirmed only on a successful result after the buyer acts on that prompt (see
 * confirmationSteps). The order changes once per confirmed payment, however many confirmations arrive.
 */
export function PaymentStatusPanel({ state, amount, orderReference, phone: initialPhone, transactionId, sentAt, staleMinutes, failure, confirmations = 0, retryable, onSend, onResend, onCheckAgain }: {
  state: PaymentState; amount: Money; orderReference: string; phone?: string; transactionId?: string; sentAt?: string; staleMinutes?: number
  failure?: string; confirmations?: number; retryable?: boolean; onSend?: (phone: string) => void; onResend?: () => void; onCheckAgain?: () => void
}) {
  const [phone, setPhone] = useState(initialPhone ?? '')
  const look = paymentLook[state]
  const valid = Boolean(toSellaPayPhone(phone))
  return (
    <section aria-label="Payment" className={cn('flex flex-col gap-4 rounded-md border p-4', state === 'failed' ? 'border-tone-danger' : state === 'stale' ? 'border-tone-warning' : state === 'confirmed' || state === 'reconciled' ? 'border-tone-success' : 'border-border', 'bg-surface')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm text-muted">Order {orderReference}</span>
          <span className="font-display text-3xl font-extrabold tabular">{formatMoney(amount)}</span>
        </div>
        <Stamp tone={look.tone} condition={look.condition} fresh={state === 'confirmed'}>{look.label}</Stamp>
      </div>

      {state !== 'created' ? <Thread label="Payment confirmation" steps={confirmationSteps(state, sentAt)} /> : null}

      {state === 'created' ? (
        <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); if (valid) onSend?.(phone) }}>
          <FieldInput field={phoneField} value={phone} onChange={v => setPhone(String(v ?? ''))} />
          <Button type="submit" variant="primary" size="lg" leadingIcon={Smartphone} disabled={!valid}>Send M-Pesa prompt</Button>
          <p className="flex items-center gap-1.5 text-sm text-muted"><Icon icon={Lock} />Paid through SellaPay. SokoMesh never sees your M-Pesa PIN.</p>
        </form>
      ) : null}

      {state === 'pending' ? (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">Check the phone {phone ? maskPhone(phone) : ''} and enter your M-Pesa PIN.</p>
          <p className="text-md text-muted">The prompt was sent{sentAt ? ` at ${formatTime(sentAt)}` : ''}. The payment is confirmed only once you approve it and M-Pesa reports success; keep this page open and it updates by itself.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onResend}>Resend prompt</Button>
            <Button variant="ghost">Use another number</Button>
          </div>
        </div>
      ) : null}

      {state === 'stale' ? (
        <div role="alert" className="flex flex-col gap-2 rounded-sm border border-tone-warning bg-tone-warning-bg/60 p-3">
          <p className="font-semibold">No result from M-Pesa for {staleMinutes ?? 'several'} minutes, so the payment is not confirmed.</p>
          <p className="text-md">Do not pay again. It is confirmed only if a successful result arrives; if money left your M-Pesa, it will be matched to this order and any duplicate refunded. Your stock stays reserved while we check.</p>
          <Button size="sm" variant="secondary" className="self-start" onClick={onCheckAgain}>Check again</Button>
        </div>
      ) : null}

      {state === 'failed' ? (
        <div role="alert" className="flex flex-col gap-2">
          <p className="font-semibold text-tone-danger">{failure ?? 'The payment did not go through.'}</p>
          <p className="text-md text-muted">The payment was not confirmed and the order is still unpaid. {retryable ? 'No money was taken. You can send the prompt again while your stock is still reserved.' : 'Contact the buyer owner or choose another payment method.'}</p>
          {retryable ? <Button variant="primary" className="self-start" onClick={onResend}>Send the prompt again</Button> : null}
        </div>
      ) : null}

      {state === 'cancelled' ? (
        <div className="flex flex-col gap-2">
          <p className="text-md">The prompt was cancelled on the phone, so the payment was not confirmed. Nothing was charged and the order is still unpaid.</p>
          {retryable ? <Button variant="primary" className="self-start" onClick={onResend}>Send the prompt again</Button> : null}
        </div>
      ) : null}

      {state === 'confirmed' || state === 'reconciled' ? (
        <p className="text-md">{state === 'confirmed' ? 'Approved on the phone and reported successful by M-Pesa. Sellers have been told to start picking.' : 'Payment matched to the order and the sellers’ payout ledgers.'}
          {confirmations > 1 ? <span className="mt-1 block text-sm text-muted">{confirmations} confirmations received; applied once.</span> : null}
        </p>
      ) : null}

      {transactionId ? (
        <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-border pt-3 text-sm">
          <dt className="text-muted">Transaction</dt><dd className="flex items-center gap-1"><code className="font-mono">{transactionId}</code><CopyValue value={transactionId} label="Copy transaction ID" /></dd>
          {sentAt ? <><dt className="text-muted">Requested</dt><dd className="tabular">{formatDateTime(sentAt)}</dd></> : null}
          <dt className="text-muted">Provider</dt><dd>SellaPay · M-Pesa</dd>
        </dl>
      ) : null}
    </section>
  )
}
