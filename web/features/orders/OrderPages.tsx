'use client'

// SM-F-15 orders for both sides, with purchase approval (SM-F-12), stock holds and payment (SM-F-13, 14),
// delivery tracking (SM-F-17), reorder (SM-F-20) and return cases (SM-F-18). Which commands an order offers,
// to whom and in which state, is the API's (`_can`); this page lays them out: approval and payment in blocks
// of their own, fulfilment in the header's action bar, delivery updates on each shipment. Orders are
// snapshots: lines and prices never change after they are placed.

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ApprovalFlowBlock, type ApprovalStep } from '@/components/commerce/cart'
import { DeliveryTrackingBlock, OrderTimelineBlock } from '@/components/commerce/orders'
import { OrderPayment, pollWhileWaiting } from '@/components/commerce/payment'
import { ReorderDiffBlock, type ReorderLine } from '@/components/commerce/pricing'
import { stockFrom } from '@/components/commerce/types'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { DetailBlock } from '@/components/kernel/blocks/DataBlocks'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { StatusBadge } from '@/components/kernel/feedback/StatusBadge'
import { ProjectedForm } from '@/components/kernel/forms/ProjectedForm'
import { PageSection } from '@/components/layout/section'
import { DensityRegion } from '@/components/layout/primitives'
import { Button, buttonStyles } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { ApiError, api, attempt } from '@/lib/client/api'
import { withUploads } from '@/lib/client/files'
import { latestPayment } from '@/lib/client/payments'
import type { OrderRecord, ReorderDifference, ReorderResult, ShipmentRecord } from '@/lib/client/records'
import { useCommand, useRecord, useRefresh, useSave, useSource } from '@/lib/client/resources'
import { may, useSession } from '@/lib/client/session'
import { ApprovalPolicyMeta, CartLineMeta, CartMeta, OrderMeta, ReturnCaseMeta, ShipmentMeta } from '@/lib/contract/generated'
import type { ActionMeta, AppError, ModelMeta } from '@/lib/contract/types'
import { formatDateTime } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import { ClipboardList, LifeBuoy } from 'lucide-react'

export type Side = 'buyer' | 'seller'

const SUMMARY = ['order_number', 'status', 'submitted_at', 'submitted_by', 'delivery_address', 'special_instructions', 'total']
// Commands with a block of their own on this page; the header's action bar offers the rest.
const OWN_BLOCKS = ['approve', 'reject', 'reorder', 'pay']
const lifecycleMeta: ModelMeta = { ...OrderMeta, actions: OrderMeta.actions.filter(a => !OWN_BLOCKS.includes(a.name)) }
const actionNamed = (name: string) => OrderMeta.actions.find(a => a.name === name) as ActionMeta
const roleChoices = ApprovalPolicyMeta.fields.find(f => f.name === 'approver_role_keys')?.choices ?? []
const roleLabel = (key: string) => roleChoices.find(c => c.value === key)?.label ?? key
const orderHref = (side: Side, id: string) => (side === 'seller' ? `/sell/orders/${id}` : `/orders/${id}`)
const quoteHref = (side: Side, id: string) => (side === 'seller' ? `/sell/quotes/${id}` : `/quotes/${id}`)
const caseHref = (side: Side, id: string) => (side === 'seller' ? `/sell/returns/${id}` : `/returns/${id}`)
const caseStatus = ReturnCaseMeta.fields.find(f => f.name === 'status')!
const caseType = ReturnCaseMeta.fields.find(f => f.name === 'case_type')!
// Mirrors apps.returns.services.OPENABLE so the button appears only where the API would accept a claim.
const CLAIMABLE: readonly string[] = ['shipped', 'delivered', 'disputed', 'partially_fulfilled']
const CLAIM_FIELDS = ['order_line', 'case_type', 'reason_code', 'quantity', 'reason_details']

/** Each side sees its own orders (the API scopes them); the other party is the column that matters. */
export function OrdersPage({ side }: { side: Side }) {
  const source = useSource(OrderMeta)
  const meta: ModelMeta = { ...OrderMeta, list: { ...OrderMeta.list, fields: OrderMeta.list.fields.filter(f => f !== (side === 'seller' ? 'seller_organization' : 'buyer_organization')) } }
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={OrderMeta} title="Orders"
        description={side === 'seller'
          ? 'Orders buyers placed with you, newest first. Confirm them, pick, ship and record delivery; each step is kept in the order history.'
          : 'Everything your organization has ordered, newest first. Open an order to follow it, approve it or copy it into a new cart.'} />
      <ListBlock meta={meta} records={[]} query="server" source={source} narrow="collapse" href={r => orderHref(side, r.id)}
        empty={side === 'seller'
          ? { kind: 'no-data', title: 'No orders yet', description: 'Orders appear here once a buyer places one, or once their approver releases it.' }
          : { kind: 'no-data', title: 'No orders yet', description: 'Orders appear here once your organization checks out a cart or accepts a quote.' }} />
    </>
  )
}

export const reorderLine = (d: ReorderDifference): ReorderLine => ({
  id: d.line_id, product: d.product, unit: d.unit, thenQuantity: d.then.quantity, thenPrice: d.then.unit_price,
  nowQuantity: d.now?.quantity, nowPrice: d.now?.unit_price, stock: d.now ? stockFrom(d.now.stock) : undefined, kinds: d.kinds, addable: d.addable,
})

const messageOf = (err: unknown) => (err instanceof ApiError ? err.error.detail : typeof err === 'object' && err && 'detail' in err ? String((err as AppError).detail) : 'Try again in a moment.')

/** The approval steps: each decision taken, then the approvals still needed. */
function approvalSteps(a: NonNullable<OrderRecord['approval']>): ApprovalStep[] {
  const who = a.roles.map(roleLabel).join(' or ')
  const left = a.state === 'pending' ? Math.max(0, a.minimum - a.approved) : 0
  return [
    ...a.decisions.map((d, i) => ({ level: i + 1, role: who, approver: d.approver, decision: d.decision, comment: d.comment || undefined, decidedAt: d.decided_at })),
    ...Array.from({ length: left }, (_, i) => ({ level: a.decisions.length + i + 1, role: who })),
  ]
}

function Approval({ order }: { order: OrderRecord }) {
  const a = order.approval!
  const command = useCommand(OrderMeta)
  const toast = useToast()
  const [pending, setPending] = useState<'approved' | 'rejected' | null>(null)
  const decide = (decision: 'approved' | 'rejected', comment: string) => {
    setPending(decision)
    command.run(actionNamed(decision === 'approved' ? 'approve' : 'reject'), order, { comment })
      .then(() => toast({ tone: 'success', title: decision === 'approved' ? 'Approved' : 'Rejected', description: decision === 'approved' ? `${order.order_number} is on its way to ${order.seller.label}.` : `${order.order_number} is cancelled; the person who placed it is told why.` }))
      .catch(err => toast({ tone: 'danger', title: 'Not recorded', description: messageOf(err), persistent: true }))
      .finally(() => setPending(null))
  }
  const mine = order.submitted_by && !a.can_decide && a.state === 'pending'
  const exempt = a.state === 'not_required'
  return (
    <ApprovalFlowBlock state={a.state === 'not_required' ? 'not-required' : a.state} policyName={a.policy} threshold={a.threshold} orderTotal={order.total} steps={exempt ? [] : approvalSteps(a)} canDecide={a.can_decide}
      note={exempt && a.placed_as ? `Placed by a ${roleLabel(a.placed_as).toLowerCase()}: under this policy their own orders go straight to the seller.` : undefined}
      onDecide={decide} pending={pending} commentField={OrderMeta.fields.find(f => f.name === 'comment')}
      waiting={mine ? `Waiting for a ${a.roles.map(roleLabel).join(' or ').toLowerCase()} other than the person who placed it. Everyone involved is notified when they decide.` : undefined} />
  )
}

/** The cases opened on this order, and (for the buyer) a claim on one of its lines. */
function Cases({ order, side }: { order: OrderRecord; side: Side }) {
  const { data: session } = useSession()
  const save = useSave(ReturnCaseMeta, [OrderMeta])
  const router = useRouter()
  const cases = order.cases ?? []
  const canClaim = side === 'buyer' && CLAIMABLE.includes(order.status) && may(session, 'return_case.create')
  if (!cases.length && !canClaim) return null
  const lines = order.lines.map(l => ({ value: l.id, label: `${l.product} · ${l.pack_label}`, description: `${l.quantity} ordered` }))
  const claim = canClaim ? (
    <ProjectedForm meta={ReturnCaseMeta} fields={CLAIM_FIELDS} mode="create" recipe="sheet" submitLabel="Open the case" options={{ order_line: lines }}
      initial={{ case_type: 'damage', order_line: order.lines.length === 1 ? { id: order.lines[0]!.id, label: lines[0]!.label } : null }}
      title="Report a problem" description={`Tell ${order.seller.label} what went wrong with a line of ${order.order_number}. Add photos on the case once it is open.`}
      trigger={<Button variant="secondary" leadingIcon={LifeBuoy}>Report a problem</Button>}
      onSubmit={values => attempt(async () => {
        const opened = await save.mutateAsync({ body: { ...values, order: order.id } })
        router.push(caseHref(side, String(opened.id)) as Route)
      }, 'Case opened')} />
  ) : null
  return (
    <PageSection title="Returns and disputes" actions={claim}
      description={side === 'seller' ? 'Claims the buyer opened on this order. Decide each one on its case page.' : 'Claims on this order and where they stand.'}>
      {cases.length ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {cases.map(c => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex min-w-0 flex-col">
                <Link href={caseHref(side, c.id) as Route} className="font-mono font-semibold text-primary hover:underline">{c.reference}</Link>
                <span className="text-sm text-muted">{caseType.choices?.find(t => t.value === c.type)?.label ?? c.type}{c.line ? ` · ${c.line}` : ' · the whole order'}</span>
              </span>
              <StatusBadge field={caseStatus} value={c.status} />
            </li>
          ))}
        </ul>
      ) : <p className="text-md text-muted">Nothing reported. Claims are accepted for 14 days after delivery.</p>}
    </PageSection>
  )
}

/** One shipment, read from its own resource so its commands (`_can`) are the API's. */
function Shipment({ id }: { id: string }) {
  const record = useRecord<ShipmentRecord>(ShipmentMeta, id)
  const command = useCommand(ShipmentMeta, [OrderMeta])
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the delivery" />
  if (record.isError || !record.data) return <ErrorState {...errorFrom(record.error)} size="inline" title="The delivery did not load" onRetry={() => void record.refetch()} />
  const s = record.data
  // Proof of delivery is chosen in the form and uploaded first, as a private document (lib/client/files).
  const run = withUploads(command.run)
  return (
    <DeliveryTrackingBlock status={s.status} carrier={s.carrier_name} reference={s.carrier_reference} windowStart={s.estimated_start_at ?? undefined} windowEnd={s.estimated_end_at ?? undefined}
      events={s.events.map(e => ({ id: e.id, at: e.occurred_at, label: e.description && e.description !== `${e.label}.` ? `${e.label}: ${e.description}` : e.label, location: e.location ?? undefined }))}
      delayed={s.delayed} stale={s.stale} lastEventAt={s.last_event_at ?? undefined} proofOfDelivery={s.proof_of_delivery ? { ...s.proof_of_delivery, state: 'ready' } : undefined}
      actions={<ActionBar meta={ShipmentMeta} record={s} onRun={run} pending={command.pending} density="compact" />} />
  )
}

export function OrderPage({ id }: { id: string }) {
  // While an M-Pesa prompt waits for its result the order is read again every few seconds (bounded).
  const record = useRecord<OrderRecord>(OrderMeta, id, pollWhileWaiting)
  const command = useCommand(OrderMeta, [ShipmentMeta])
  const refresh = useRefresh()
  const router = useRouter()
  const toast = useToast()
  const [copying, setCopying] = useState(false)
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the order" />
  if (record.isError || !record.data) return <ErrorState {...errorFrom(record.error)} title="The order did not load" onRetry={() => void record.refetch()} />
  const o = record.data
  const side: Side = o.side === 'seller' ? 'seller' : 'buyer'
  const reorder = async () => {
    setCopying(true)
    try {
      const result = await api<ReorderResult>(`${OrderMeta.path}/${o.id}/reorder`, { method: 'POST', body: {} })
      await refresh(CartMeta.path!, CartLineMeta.path!, OrderMeta.path!)
      const left = result.unavailable_line_ids.length
      toast({ tone: left ? 'warning' : 'success', title: 'Copied to a new cart', description: left ? `${left} ${left === 1 ? 'line was' : 'lines were'} left out; the rest are at today’s prices.` : 'Every line is in your cart at today’s prices.' })
      router.push('/cart' as Route)
    } catch (err) {
      toast({ tone: 'danger', title: 'Not copied', description: messageOf(err), persistent: true })
    } finally {
      setCopying(false)
    }
  }
  const next = o.next_actions.filter(n => !OWN_BLOCKS.includes(n) && (o._can ?? []).includes(n)).map(n => actionNamed(n).label)
  const d = o.delivery
  const last = latestPayment(o)
  const paid = last && (last.status === 'confirmed' || last.status === 'refunded') ? last : undefined
  return (
    <>
      <HeaderBlock level={1} source="record" meta={OrderMeta} record={o} title={o.order_number}
        breadcrumbs={[{ label: 'Orders', href: side === 'seller' ? '/sell/orders' : '/orders' }, { label: o.order_number }]}
        description={side === 'seller' ? `For ${o.buyer.label}. ${o.lines.length} ${o.lines.length === 1 ? 'line' : 'lines'}, ${formatMoney(o.total)}.` : `From ${o.seller.label}. Prices and products below are as they were ordered; they never change.`}
        actions={<ActionBar meta={lifecycleMeta} record={o} onRun={command.run} pending={command.pending} inline={3} />} />
      {o.approval ? <Approval order={o} /> : null}
      {side === 'buyer' && (o.status === 'awaiting_payment' || o.payments?.length) ? (
        <PageSection title="Payment" description={o.status === 'awaiting_payment' ? `Pay by M-Pesa to send the order to ${o.seller.label}. The packs are held for you until then.` : 'How this order was paid.'}>
          <div id="payment"><OrderPayment order={o} onCheckAgain={() => void record.refetch()} /></div>
        </PageSection>
      ) : null}
      {side === 'seller' && o.fulfilment ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface px-4 py-3">
          <span className="flex flex-col"><span className="font-semibold">Pick list</span><span className="text-sm text-muted">Pick, pack and hand over in the warehouse; the order follows each step.</span></span>
          <Link href={`/sell/fulfilment/${o.fulfilment.id}` as Route} className={buttonStyles({ variant: 'primary' })}><Icon icon={ClipboardList} />Open the pick list</Link>
        </div>
      ) : null}
      {o.reorder ? (
        <ReorderDiffBlock orderReference={o.order_number} placedOn={o.submitted_at} lines={o.reorder.lines.map(reorderLine)}
          replacesCartLines={o.reorder.current_cart_lines} adding={copying} onAdd={() => void reorder()} />
      ) : null}
      <Cases order={o} side={side} />
      {o.shipments?.length ? (
        <PageSection title="Delivery" description={side === 'seller' ? 'Add updates as they happen; buyers are told about delays and the last mile.' : 'Updates from the seller and the carrier, latest first.'}>
          <div className="flex flex-col gap-4">{o.shipments.map(s => <Shipment key={s.id} id={s.id} />)}</div>
        </PageSection>
      ) : null}
      <PageSection title="Lines" description="What was ordered, at the price agreed then.">
        <DensityRegion density="compact" className="overflow-x-auto border border-border bg-surface">
          <Table caption={`Lines of ${o.order_number}`}>
            <THead><tr><Th>Product</Th><Th>Pack</Th><Th>SKU</Th><Th numeric>Quantity</Th><Th numeric>Price per pack</Th><Th numeric>Line total</Th></tr></THead>
            <TBody>
              {o.lines.map(l => (
                <Tr key={l.id}>
                  <Td className="font-medium">{l.product}</Td>
                  <Td>{l.pack_label}</Td>
                  <Td><code className="font-mono text-sm">{l.sku}</code></Td>
                  <Td numeric>{l.quantity}</Td>
                  <Td numeric className="whitespace-nowrap">{formatMoney(l.unit_price)}{l.price_explanation && l.price_explanation !== 'List price' ? <span className="block text-sm text-muted">{l.price_explanation}</span> : null}</Td>
                  <Td numeric className="whitespace-nowrap font-semibold">{formatMoney(l.line_total)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </DensityRegion>
      </PageSection>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 border-t border-border pt-6">
          <OrderTimelineBlock transitions={(o.transitions ?? []).map(t => ({ id: t.id, to: t.to, from: t.from ?? undefined, at: t.at, actor: t.actor, reason: t.reason ?? undefined }))} next={next} />
        </div>
        <PageSection title="Order">
          <DetailBlock meta={{ ...OrderMeta, fields: OrderMeta.fields.filter(f => SUMMARY.includes(f.name)) }} record={o} surface="flat" />
          {d ? <p className="mt-3 text-md text-muted">Deliver to {[d.line1, d.city, d.region].filter(Boolean).join(', ')}, as it was when the order was placed.</p> : null}
          {paid ? <p className="mt-2 text-md">Paid {formatMoney(paid.amount)} by M-Pesa{paid.reference ? <>, reference <code className="font-mono">{paid.reference}</code></> : null}{paid.confirmed_at ? ` on ${formatDateTime(paid.confirmed_at)}` : ''}.{Number(paid.refunded_amount) > 0 ? ` ${formatMoney(paid.refunded_amount)} refunded.` : ''}</p> : null}
          {o.quote ? <p className="mt-2 text-md">Placed from quote <Link href={quoteHref(side, o.quote.id) as Route} className="font-semibold text-primary hover:underline">{o.quote.reference}</Link> at the offered prices.</p> : null}
        </PageSection>
      </div>
    </>
  )
}
