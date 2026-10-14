'use client'

import { ArrowDownLeft, ArrowUpRight, Pause } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { unitLabel } from '@/components/kernel/fields/types'
import { RelativeTime } from '@/components/kernel/fields/islands'
import { Empty } from '@/components/kernel/fields/views'
import { Icon } from '@/components/ui/icon'
import { chipStyles } from '@/components/ui/chip'
import { Stamp, type StampCondition } from '@/components/ui/stamp'
import { ScrollArea, TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/contract/types'
import { formatDay, formatTime } from '@/lib/format'
import type { InventoryMovement, MovementType, Reservation, ReservationStatus, Stock, StockState } from './types'

const qty = (n: number, unit: string) => `${n.toLocaleString('en-KE')} ${unitLabel(unit, n) ?? unit}`

const stockLook: Record<StockState, { tone: Tone; label: string; condition?: StampCondition }> = {
  available: { tone: 'success', label: 'In stock' },
  low: { tone: 'warning', label: 'Low stock' },
  reserved: { tone: 'signal', label: 'Reserved' },
  'out-of-stock': { tone: 'danger', label: 'Out of stock', condition: 'unavailable' },
  unknown: { tone: 'neutral', label: 'Stock not reported', condition: 'unknown' },
}

/** Availability from the backend's ledger. Compact for cards and rows; full explains the number. */
export function StockAvailabilityIndicator({ stock, variant = 'compact' }: { stock: Stock; variant?: 'compact' | 'full' }) {
  const look = stockLook[stock.state]
  const detail =
    stock.state === 'out-of-stock' ? (stock.restockOn ? `restock ${formatDay(stock.restockOn)}` : undefined)
    : stock.state === 'unknown' ? undefined
    : stock.state === 'reserved' && stock.heldForYou ? `${qty(stock.heldForYou, stock.unit)} held for you`
    : `${qty(stock.available, stock.unit)}${stock.state === 'low' ? ' left' : ''}`
  if (variant === 'compact') return <Stamp tone={look.tone} condition={look.condition} size="sm" detail={detail}>{look.label}</Stamp>
  return (
    <div className="flex flex-col gap-1.5">
      <Stamp tone={look.tone} condition={look.condition} detail={detail} className="self-start">{look.label}</Stamp>
      <p className="text-sm text-muted">
        {stock.state === 'out-of-stock' && (stock.restockOn ? `The seller expects new stock on ${formatDay(stock.restockOn)}. You can request a quote to secure it.` : 'The seller has not given a restock date.')}
        {stock.state === 'unknown' && (stock.countedAt ? <>Last counted <RelativeTime iso={stock.countedAt} />; confirm before ordering.</> : 'The seller has not reported stock for this item.')}
        {(stock.state === 'available' || stock.state === 'low' || stock.state === 'reserved') && (
          <>
            {qty(stock.available, stock.unit)} available to order
            {stock.reservedByOthers ? ` · ${qty(stock.reservedByOthers, stock.unit)} held in other buyers' checkouts` : ''}
            {stock.heldForYou && stock.heldUntil ? ` · yours held until ${formatTime(stock.heldUntil)}` : ''}
          </>
        )}
      </p>
    </div>
  )
}

const reservationLook: Record<ReservationStatus, { tone: Tone; label: string; condition?: StampCondition }> = {
  active: { tone: 'signal', label: 'Reserved' },
  expiring: { tone: 'warning', label: 'Expiring', condition: 'pending' },
  expired: { tone: 'danger', label: 'Reservation expired' },
  consumed: { tone: 'success', label: 'In your order' },
  released: { tone: 'neutral', label: 'Released' },
}

/** A bounded stock hold. Every state says what happened to the units. */
export function ReservationIndicator({ reservation, variant = 'compact' }: { reservation: Reservation; variant?: 'compact' | 'full' }) {
  const r = reservation
  const look = reservationLook[r.status]
  const amount = qty(r.quantity, r.unit)
  if (variant === 'compact') {
    return <Stamp tone={look.tone} condition={look.condition} size="sm" detail={r.status === 'active' || r.status === 'expiring' ? `${amount} until ${formatTime(r.expiresAt)}` : amount}>{look.label}</Stamp>
  }
  const explain: Record<ReservationStatus, string> = {
    active: `${amount} of ${r.product} are held for you until ${formatTime(r.expiresAt)}. Other buyers cannot take them.`,
    expiring: `Less than two minutes left. Pay now or the ${amount} go back on sale.`,
    expired: `The hold ended at ${formatTime(r.expiresAt)} and the ${amount} went back on sale. Check availability to reserve again.`,
    consumed: `${amount} moved into order ${r.orderReference ?? ''}.`,
    released: `You removed ${amount} from your cart, so the hold was released.`,
  }
  return (
    <div className={cn('flex flex-col gap-2 rounded-md border p-3', r.status === 'expired' ? 'border-tone-danger bg-tone-danger-bg/40' : r.status === 'expiring' ? 'border-tone-warning bg-tone-warning-bg/40' : 'border-border bg-surface')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stamp tone={look.tone} condition={look.condition}>{look.label}</Stamp>
        <code className="font-mono text-xs text-muted">{r.id}</code>
      </div>
      <p className="text-md">{explain[r.status]}</p>
    </div>
  )
}

// One shared second clock (bounded: a single interval while any countdown is mounted).
let second: number | undefined
let tick: ReturnType<typeof setInterval> | undefined
const subs = new Set<() => void>()
function subscribe(cb: () => void) {
  subs.add(cb)
  if (!tick) { second = Math.floor(Date.now() / 1000); tick = setInterval(() => { second = Math.floor(Date.now() / 1000); subs.forEach(s => s()) }, 1000) }
  return () => { subs.delete(cb); if (!subs.size && tick) { clearInterval(tick); tick = undefined } }
}
const snapshot = () => (second ??= Math.floor(Date.now() / 1000))
const serverSnapshot = () => null

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Time left on a reservation. Announces only at 5 min, 1 min and expiry (not every second),
 * keeps the same layout under reduced motion, and freezes at `pausedAt` (payment settling).
 */
export function ReservationCountdown({ expiresAt, totalSeconds, pausedAt, onExpire, label = 'Stock held for you' }: { expiresAt: string; totalSeconds: number; pausedAt?: string; onExpire?: () => void; label?: string }) {
  const nowSec = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const paused = Boolean(pausedAt)
  const end = Math.floor(new Date(expiresAt).getTime() / 1000)
  const at = pausedAt ? Math.floor(new Date(pausedAt).getTime() / 1000) : nowSec
  const remaining = at === null ? null : Math.max(0, end - at)
  const expired = remaining === 0
  const fired = useRef(false)
  useEffect(() => {
    if (expired && !fired.current) { fired.current = true; onExpire?.() }
  }, [expired, onExpire])
  const announce = remaining === null ? '' : expired ? 'Reservation expired. The stock went back on sale.' : remaining <= 60 ? 'One minute left on your reservation.' : remaining <= 300 ? 'Five minutes left on your reservation.' : ''
  const pct = remaining === null ? 100 : Math.max(0, Math.min(100, (remaining / totalSeconds) * 100))
  const tone = expired ? 'danger' : remaining !== null && remaining <= 120 ? 'warning' : 'primary'
  return (
    <div className={cn('flex flex-col gap-2 rounded-md border p-3', expired ? 'border-tone-danger bg-tone-danger-bg/40' : tone === 'warning' ? 'border-tone-warning bg-tone-warning-bg/40' : 'border-signal-border bg-signal-soft')}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{expired ? 'Reservation expired' : paused ? 'Countdown paused' : label}</span>
        <span className={cn('font-display text-2xl font-extrabold tabular', expired && 'text-tone-danger', tone === 'warning' && 'text-tone-warning')} aria-hidden="true">
          {paused ? <Icon icon={Pause} className="mr-1 inline size-5" /> : null}{remaining === null ? '--:--' : mmss(remaining)}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-xs bg-surface" aria-hidden="true">
        <div className={cn('h-full origin-left', tone === 'primary' && 'bg-primary', tone === 'warning' && 'bg-tone-warning', tone === 'danger' && 'bg-tone-danger')} style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <p className="text-sm text-muted">
        {expired ? 'Check availability and reserve again to continue.' : paused ? 'Paused while the payment is being confirmed; the hold is extended until it settles.' : `Pay before ${formatTime(expiresAt)} to keep these units.`}
      </p>
      <span className="sr-only" role="timer" aria-live="polite" aria-atomic="true">{announce}</span>
    </div>
  )
}

const movementLabel: Record<MovementType, string> = {
  receipt: 'Receipt', reservation: 'Reservation', release: 'Release', allocation: 'Allocation', adjustment: 'Adjustment', shipment: 'Shipment',
}

/** Immutable stock ledger: available quantity is derivable from these rows alone (SM-F-07). */
export function InventoryLedgerBlock({ movements, unit, now, density = 'compact' }: { movements: readonly InventoryMovement[]; unit: string; now?: string; density?: 'compact' | 'comfortable' }) {
  const [types, setTypes] = useState<MovementType[]>([])
  const shown = types.length ? movements.filter(m => types.includes(m.type)) : movements
  const present = [...new Set(movements.map(m => m.type))]
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Inventory ledger" data-density={density}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Movement types">
        {present.map(t => {
          const on = types.includes(t)
          return (
            <button key={t} type="button" aria-pressed={on} onClick={() => setTypes(s => (on ? s.filter(x => x !== t) : [...s, t]))}
              className={chipStyles({ on })}>
              {movementLabel[t]}
            </button>
          )
        })}
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <ScrollArea label="Inventory movements, scrolls sideways">
          <Table caption="Inventory movements">
            <THead><tr><Th>When</Th><Th>Movement</Th><Th>Reference</Th><Th numeric>Change</Th><Th numeric>Balance</Th><Th>By</Th><Th>Reason</Th></tr></THead>
            <TBody>
              {shown.map(m => {
                const inbound = m.quantity > 0
                return (
                  <Tr key={m.id} interactive>
                    <Td className="whitespace-nowrap text-muted"><RelativeTime iso={m.at} now={now} /></Td>
                    <Td><span className="font-medium">{movementLabel[m.type]}</span></Td>
                    <Td><code className="font-mono text-sm">{m.reference}</code></Td>
                    <Td numeric className={cn('font-semibold whitespace-nowrap', inbound ? 'text-tone-success' : 'text-foreground')}>
                      <Icon icon={inbound ? ArrowDownLeft : ArrowUpRight} className="mr-1 inline" label={inbound ? 'In' : 'Out'} />
                      {inbound ? '+' : '−'}{Math.abs(m.quantity).toLocaleString('en-KE')}
                    </Td>
                    <Td numeric className="font-semibold">{m.balanceAfter.toLocaleString('en-KE')}</Td>
                    <Td className="whitespace-nowrap">{m.actor}</Td>
                    <Td className="max-w-64 text-muted">{m.reason ?? <Empty label="No reason recorded" />}</Td>
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        </ScrollArea>
        <p className="border-t border-border px-3 py-2.5 text-sm text-muted">
          Quantities in {unitLabel(unit, 2)}. Rows are never edited: corrections are new adjustment movements with a reason.
        </p>
      </div>
    </section>
  )
}
