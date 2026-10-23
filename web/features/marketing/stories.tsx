// The landing's explanatory sections (L-01): how an order moves, one record behind every figure, and the three
// guarantees shown working. Each step or proof carries a real component in the state it would show; the
// references follow the formats the application issues (SO- orders, RSV- holds, SBX- sandbox payments). The
// design-system page renders the same copy with its own fixtures.

import type { ReactNode } from 'react'
import { PaymentStatusPanel } from '@/components/commerce/checkout'
import { PriceTierTable } from '@/components/commerce/pricing'
import { InventoryLedgerBlock, ReservationCountdown, ReservationIndicator, StockAvailabilityIndicator } from '@/components/commerce/stock'
import { Thread } from '@/components/ui/thread'
import type { MeshRecord } from './MarketingInteractive'

/** Discover, compare, order, fulfil. `discover` is a product cell from the live catalogue. */
export function flowSteps(discover: ReactNode) {
  return [
    { key: 'discover' as const, title: 'Discover', body: 'Search the products you may buy, with filters from each category’s contract.', example: <div className="max-w-xs">{discover}</div> },
    { key: 'compare' as const, title: 'Compare', body: 'See your price at each quantity, and why, before you commit.', example: <PriceTierTable tiers={[{ minQuantity: 5, maxQuantity: 9, unitPrice: '1740.00' }, { minQuantity: 10, maxQuantity: 49, unitPrice: '1690.00' }, { minQuantity: 50, unitPrice: '1640.00' }]} unit="bale" quantity={20} /> },
    { key: 'order' as const, title: 'Order', body: 'Your packs are held for 15 minutes while you pay by M-Pesa.', example: <ReservationCountdown expiresAt="2026-10-12T11:52:00+03:00" totalSeconds={900} pausedAt="2026-10-12T11:41:00+03:00" /> },
    { key: 'fulfil' as const, title: 'Fulfil', body: 'The seller picks, packs and hands over; you see each step.', example: <Thread label="Fulfilment" orientation="vertical" steps={[{ key: 'a', label: 'Confirmed by Mwangaza', state: 'done' }, { key: 'b', label: 'Picked 3 of 3 lines', state: 'done' }, { key: 'c', label: 'Handed to Rift Express', state: 'current', detail: 'Expected 12:00 to 14:00' }, { key: 'd', label: 'Delivered', state: 'upcoming' }]} /> },
  ]
}

// The proofs tell one moment at Mwangaza's Nakuru store; relative times read from it, not from today.
const STORY_NOW = '2026-10-12T11:30:00+03:00'

export function trustProofs(now = STORY_NOW) {
  return {
    stock: { title: 'Stock is the sum of its movements', body: 'Available packs are worked out from receipts, holds, releases and shipments, never typed in.', example: <InventoryLedgerBlock unit="bale" now={now} movements={[
      { id: 'a', type: 'reservation', quantity: -24, unit: 'bale', balanceAfter: 0, onHandAfter: 24, at: '2026-10-12T11:22:00+03:00', actor: 'Wanjiru General Stores', reference: 'RSV-2026-0213' },
      { id: 'b', type: 'release', quantity: 12, unit: 'bale', balanceAfter: 24, onHandAfter: 24, at: '2026-10-12T10:58:00+03:00', actor: 'SokoMesh', reference: 'RSV-2026-0207', reason: 'Hold lapsed' },
      { id: 'c', type: 'reservation', quantity: -12, unit: 'bale', balanceAfter: 12, onHandAfter: 24, at: '2026-10-12T10:43:00+03:00', actor: 'Baraka Mini-Mart', reference: 'RSV-2026-0207' },
      { id: 'd', type: 'shipment', quantity: -96, unit: 'bale', balanceAfter: 24, onHandAfter: 24, at: '2026-10-11T15:10:00+03:00', actor: 'Peter Kamau', reference: 'SHP-20437' },
      { id: 'e', type: 'receipt', quantity: 120, unit: 'bale', balanceAfter: 120, onHandAfter: 120, at: '2026-10-10T07:40:00+03:00', actor: 'Peter Kamau', reference: 'Delivery note DN-3302' },
    ]} /> },
    reservation: { title: 'The first hold wins; the second buyer gets a way forward', body: 'A checkout locks the stock row while it holds, so two buyers can never take the same bales.', example: (
      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
        <div className="flex flex-col gap-2 bg-surface p-3"><span className="text-sm font-semibold">Wanjiru General Stores · 11:22:03</span><ReservationIndicator reservation={{ id: 'RSV-2026-0213', quantity: 24, unit: 'bale', status: 'active', expiresAt: '2026-10-12T11:37:03+03:00', product: 'Mavuno Maize Flour 2 kg' }} variant="full" /></div>
        <div className="flex flex-col gap-2 bg-surface p-3"><span className="text-sm font-semibold">Baraka Mini-Mart · 11:22:04</span><StockAvailabilityIndicator stock={{ state: 'out-of-stock', available: 0, unit: 'bale', restockOn: '2026-10-15T09:00:00+03:00' }} variant="full" /></div>
      </div>
    ) },
    payment: { title: 'A payment changes the order once', body: 'A result the provider sends twice is recorded and ignored the second time, never applied again.', example: <PaymentStatusPanel state="confirmed" amount="48250.00" orderReference="SO-2026-0151" transactionId="SBX-4BF881F82D" sentAt="2026-10-12T11:30:00+03:00" confirmations={2} providerLabel="M-Pesa" /> },
  }
}

/** One record through the market: the product comes from the live catalogue. */
export function meshRecord(product: MeshRecord['product']): MeshRecord {
  return {
    product,
    unit: 'bale',
    stations: [
      { key: 'sellers', label: 'Sellers', figure: 'Approved wholesalers', role: 'Receive stock into the record and set its price.',
        entry: { label: 'Received', reference: 'DN-3302', detail: 'Peter Kamau, Mwangaza store in Nakuru', at: '10 Oct, 07:40', change: 120, available: 120 } },
      { key: 'catalogue', label: 'Catalogue', figure: 'Category contracts', role: 'Decide what a listing must say before it goes live.',
        entry: { label: 'Published', detail: 'Under the flour contract, by Faith Chebet', at: '11 Oct, 16:00', available: 120 } },
      { key: 'buyers', label: 'Buyers', figure: 'Retail shops', role: 'Hold stock for 15 minutes while they pay.',
        entry: { label: 'Held at checkout', reference: 'RSV-2026-0213', detail: 'Wanjiru General Stores, for 15 minutes', at: '12 Oct, 11:22', change: -24, available: 96 } },
      { key: 'orders', label: 'Orders', figure: 'One change per event', role: 'Turn a paid hold into a sale, exactly once.',
        entry: { label: 'Paid and sent to the seller', reference: 'SO-2026-0151', detail: 'M-Pesa, the repeated result ignored', at: '12 Oct, 11:30', available: 96 } },
      { key: 'fulfilment', label: 'Fulfilment', figure: 'Pick, pack, hand over', role: 'Record each handover against the order.',
        entry: { label: 'Handed over', detail: 'To Rift Express, expected 12:00 to 14:00', at: '12 Oct, 11:50', available: 96 } },
    ],
  }
}
