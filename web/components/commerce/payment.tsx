'use client'

// SM-F-13, SM-F-14: what a buyer needs to pay one order. The packs held for it and the time left, the M-Pesa
// prompt and its result, and, while the marketplace runs on the payment sandbox, a stand-in for the buyer's
// phone that answers the prompt. The API decides everything shown here: whether the order may be paid, the
// state of each attempt, and how many provider results arrived (each one is applied at most once).

import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/toast'
import { PAYMENT_POLL, latestPayment, usePayment } from '@/lib/client/payments'
import type { OrderRecord, PaymentRecord, ReservationRecord, SandboxOutcome } from '@/lib/client/records'
import type { AppError } from '@/lib/contract/types'
import { formatMoney } from '@/lib/money'
import { PaymentStatusPanel, type PaymentState } from './checkout'
import { ReservationCountdown, ReservationIndicator } from './stock'
import type { Money, Reservation, ReservationStatus } from './types'

const holdStatus: Record<ReservationRecord['status'], ReservationStatus> = { active: 'active', consumed: 'consumed', released: 'released', expired: 'expired', cancelled: 'released' }
const panelState: Record<PaymentRecord['status'], PaymentState> = {
  created: 'pending', pending: 'pending', stale: 'stale', confirmed: 'confirmed', failed: 'failed', cancelled: 'cancelled', refunded: 'refunded',
}
const providerLabel: Record<string, string> = { sandbox: 'Payment sandbox · M-Pesa test', sellapay: 'SellaPay · M-Pesa' }

const OUTCOMES: { value: SandboxOutcome; label: string; primary?: boolean }[] = [
  { value: 'approve', label: 'Enter PIN and approve', primary: true },
  { value: 'cancel', label: 'Cancel the prompt' },
  { value: 'wrong_pin', label: 'Wrong PIN' },
  { value: 'insufficient_funds', label: 'Not enough funds' },
  { value: 'timeout', label: 'Let it time out' },
]

export const reservationOf = (r: ReservationRecord, orderReference: string): Reservation => ({
  id: r.reference, quantity: r.quantity, unit: r.unit, status: holdStatus[r.status], expiresAt: r.expires_at, product: r.product, orderReference,
})

/** The sandbox's stand-in for the buyer's phone: each answer is what M-Pesa would report, sent twice. */
function SandboxPhone({ amount, orderReference, answering, onAnswer }: { amount: Money; orderReference: string; answering: SandboxOutcome | null; onAnswer: (o: SandboxOutcome) => void }) {
  return (
    <section aria-label="Sandbox phone" className="flex flex-col gap-3 border border-dashed border-border-strong bg-sunken/50 p-4">
      <div className="flex items-center gap-2">
        <Icon icon={Smartphone} className="size-5 text-muted" />
        <h3 className="font-display text-lg font-bold">Sandbox phone</h3>
      </div>
      <p className="text-md">
        <span className="block text-sm text-muted">Prompt on the buyer&apos;s phone</span>
        Pay <b className="font-semibold tabular">{formatMoney(amount)}</b> to SokoMesh for {orderReference}?
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OUTCOMES.map(o => (
          <Button key={o.value} variant={o.primary ? 'primary' : 'secondary'} className={o.primary ? 'sm:col-span-2' : undefined} disabled={Boolean(answering) && answering !== o.value}
            loading={answering === o.value} loadingLabel="Answering…" onClick={() => onAnswer(o.value)}>{o.label}</Button>
        ))}
      </div>
      <p className="text-sm text-muted">Test mode: no money moves. Each answer reaches SokoMesh as a signed result, delivered twice the way providers repeat themselves; the order changes once.</p>
    </section>
  )
}

type BlockProps = {
  orderReference: string
  amount: Money
  /** The packs held for this order; the countdown follows the first to lapse. */
  holds: readonly ReservationRecord[]
  holdSeconds: number
  payment?: PaymentRecord
  canPay: boolean
  paying?: boolean
  answering?: SandboxOutcome | null
  onPay: (phone: string) => void
  onAnswer?: (intentId: string, outcome: SandboxOutcome) => void
  onCheckAgain?: () => void
}

/** Pure: one order's holds and payment, as an editorial split (the payment left, holds and the phone right). */
export function OrderPaymentBlock({ orderReference, amount, holds, holdSeconds, payment, canPay, paying, answering = null, onPay, onAnswer, onCheckAgain }: BlockProps) {
  const [retrying, setRetrying] = useState(false)
  const active = holds.filter(h => h.status === 'active').sort((a, b) => a.expires_at.localeCompare(b.expires_at))
  const ended = !payment || payment.status === 'failed' || payment.status === 'cancelled'
  const state: PaymentState = !payment || (retrying && ended) ? 'created' : panelState[payment.status]
  const pay = (phone: string) => { setRetrying(false); onPay(phone) }
  const sandboxed = payment ? payment.provider === 'sandbox' : canPay
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <PaymentStatusPanel state={state} amount={payment?.amount ?? amount} orderReference={orderReference} transactionId={payment?.reference || undefined}
        sentAt={payment?.sent_at ?? undefined} maskedPhone={state === 'created' ? undefined : payment?.phone || undefined} failure={payment?.failure ?? undefined}
        confirmations={payment?.results_received ?? 0} retryable={canPay && ended} sending={paying} onSend={pay} onResend={() => setRetrying(true)} onCheckAgain={onCheckAgain}
        providerLabel={providerLabel[payment?.provider ?? ''] ?? 'M-Pesa'} staleMinutes={3}
        notice={sandboxed ? 'The prompt goes through SokoMesh’s payment provider. Nobody at SokoMesh sees your M-Pesa PIN.' : undefined} />
      <div className="flex min-w-0 flex-col gap-4">
        {active.length ? (
          <ReservationCountdown expiresAt={active[0]!.expires_at} totalSeconds={holdSeconds} onExpire={onCheckAgain}
            label={active.length === 1 ? 'Stock held for this order' : `${active.length} packs held for this order`} />
        ) : null}
        {payment?.sandbox && onAnswer ? <SandboxPhone amount={payment.amount} orderReference={orderReference} answering={answering} onAnswer={o => onAnswer(payment.id, o)} /> : null}
        {holds.length ? (
          <ul className="flex flex-col gap-2" aria-label="Held stock">
            {holds.map(h => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-md">
                <span className="min-w-0"><span className="font-semibold">{h.product}</span> <code className="font-mono text-sm text-muted">{h.sku}</code></span>
                <ReservationIndicator reservation={reservationOf(h, orderReference)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-md text-muted">The seller does not track stock for these packs, so nothing is held; they confirm availability with the order.</p>
        )}
        {payment && payment.duplicates > 0 ? <p className="text-sm text-muted">{payment.duplicates} repeated {payment.duplicates === 1 ? 'result' : 'results'} from the provider ignored.</p> : null}
      </div>
    </div>
  )
}

const messageOf = (err: unknown) => (typeof err === 'object' && err && 'detail' in err ? String((err as AppError).detail) : 'Try again in a moment.')

/** OrderPaymentBlock connected to the order's `pay` command and the sandbox phone. */
export function OrderPayment({ order, onCheckAgain }: { order: OrderRecord; onCheckAgain?: () => void }) {
  const payment = usePayment(order)
  const toast = useToast()
  const pay = (phone: string) => {
    payment.pay(phone).catch(err => toast({ tone: 'danger', title: 'Prompt not sent', description: messageOf(err), persistent: true }))
  }
  const answer = (id: string, outcome: SandboxOutcome) => {
    payment.answer(id, outcome).catch(err => toast({ tone: 'danger', title: 'No answer sent', description: messageOf(err), persistent: true }))
  }
  return (
    <OrderPaymentBlock orderReference={order.order_number} amount={order.total} holds={order.reservations ?? []} holdSeconds={order.hold_seconds ?? 900}
      payment={latestPayment(order)} canPay={payment.canPay} paying={payment.paying} answering={payment.answering} onPay={pay} onAnswer={answer} onCheckAgain={onCheckAgain} />
  )
}

/** For useRecord's `poll`: read an order again while its prompt waits on the provider, for a bounded time. */
export function pollWhileWaiting(order: OrderRecord | undefined): number | false {
  const p = order ? latestPayment(order) : undefined
  if (!order || order.status !== 'awaiting_payment' || !p || (p.status !== 'created' && p.status !== 'pending')) return false
  const since = p.sent_at ? Date.now() - new Date(p.sent_at).getTime() : 0
  return since < PAYMENT_POLL.forMs ? PAYMENT_POLL.everyMs : false
}
