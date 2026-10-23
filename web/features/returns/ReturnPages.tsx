'use client'

// SM-F-18 returns and disputes, for both sides: the cases on an organization's orders and one case with its
// evidence and decision. Buyers open cases from an order's page; what each side may do next (ask for or add
// evidence, decide, withdraw) is the case's own `_can`, and deciding carries out the refund and the stock.

import type { Route } from 'next'
import Link from 'next/link'
import { ReturnDisputeCaseBlock } from '@/components/commerce/orders'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { withUploads } from '@/lib/client/files'
import type { CaseRecord } from '@/lib/client/records'
import { useCommand, useRecord, useSource } from '@/lib/client/resources'
import { InventoryBalanceMeta, OrderMeta, ReturnCaseMeta } from '@/lib/contract/generated'
import type { FieldMeta } from '@/lib/contract/types'

export type Side = 'buyer' | 'seller'

const choice = (name: string, value: string | null | undefined) =>
  value ? ((ReturnCaseMeta.fields as readonly FieldMeta[]).find(f => f.name === name)?.choices?.find(c => c.value === value)?.label ?? value) : undefined
const listHref = (side: Side) => (side === 'seller' ? '/sell/returns' : '/returns')
const orderHref = (side: Side, id: string) => (side === 'seller' ? `/sell/orders/${id}` : `/orders/${id}`)

export function CasesPage({ side }: { side: Side }) {
  const source = useSource(ReturnCaseMeta)
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={ReturnCaseMeta} title="Returns and disputes"
        description={side === 'seller'
          ? 'Claims buyers opened on your orders, newest first. Ask for evidence or decide; an accepted claim is refunded at once and its packs restocked if you choose.'
          : 'Claims your organization opened on its orders. Report a problem from the order’s page, within 14 days of delivery.'} />
      <ListBlock meta={ReturnCaseMeta} records={[]} query="server" source={source} narrow="collapse" href={r => `${listHref(side)}/${r.id}`}
        empty={{ kind: 'no-data', title: 'No cases', description: side === 'seller' ? 'Nothing to decide. Cases appear here when a buyer reports a problem with an order.' : 'Nothing reported. Open a case from an order that arrived damaged, short or wrong.' }} />
    </>
  )
}

export function CasePage({ id, side }: { id: string; side: Side }) {
  const record = useRecord<CaseRecord>(ReturnCaseMeta, id)
  const command = useCommand(ReturnCaseMeta, [OrderMeta, InventoryBalanceMeta])
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the case" />
  if (record.isError || !record.data) return <ErrorState {...errorFrom(record.error)} title="The case did not load" onRetry={() => void record.refetch()} />
  const c = record.data
  const l = c.line
  const reason = [choice('reason_code', c.reason_code), c.reason_details].filter(Boolean).join('. ')
  return (
    <>
      <HeaderBlock level={1} source="record" meta={ReturnCaseMeta} record={c} title={c.reference}
        breadcrumbs={[{ label: 'Returns and disputes', href: listHref(side) }, { label: c.reference }]}
        description={<>On order <Link href={orderHref(side, c.order_ref.id) as Route} className="font-mono font-semibold text-primary hover:underline">{c.order_ref.order_number}</Link>. {side === 'seller' ? `Opened by ${c.buyer}.` : `With ${c.seller}.`}</>} />
      <div className="max-w-3xl">
        <ReturnDisputeCaseBlock reference={c.reference} type={c.case_type} status={c.status} reason={reason} openedAt={c.opened_at}
          line={l ? `${l.product} · ${c.quantity ?? l.quantity} of ${l.quantity} ${l.unit}` : 'The whole order'}
          evidence={c.evidence.map(e => ({ ...e, state: 'ready' as const, side: e.side === 'seller' ? 'seller' as const : 'buyer' as const, addedAt: e.added_at }))}
          evidenceNote={c.evidence_note || undefined} windowCloses={c.window_closes} windowOpen={c.window_open} parties={{ buyer: c.buyer, seller: c.seller }}
          decision={c.decision ? {
            label: choice('decision', c.decision)!, notes: c.decision_notes || undefined, approvedQuantity: c.approved_quantity, unit: l?.unit,
            disposition: choice('stock_disposition', c.stock_disposition), refund: c.refund_amount, refunded: c.refunded_amount, decidedAt: c.decided_at ?? undefined,
          } : undefined}
          actions={<ActionBar meta={ReturnCaseMeta} record={c} onRun={withUploads(command.run)} pending={command.pending} />} />
      </div>
    </>
  )
}
