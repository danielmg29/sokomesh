'use client'

// SM-F-16 the seller's warehouse: the queue of pick lists (one per confirmed order) and one pick list worked
// through on the floor. Each step is a `fulfillment_task` command; the order, the stock ledger, the delivery
// and any refund for packs not picked follow on the server.

import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { useToast } from '@/components/ui/toast'
import { withUploads } from '@/lib/client/files'
import type { FulfillmentTaskRecord } from '@/lib/client/records'
import { useCommand, useRecord, useSource } from '@/lib/client/resources'
import { FulfillmentTaskMeta, InventoryBalanceMeta, OrderMeta, ShipmentMeta } from '@/lib/contract/generated'
import type { ActionMeta, AppError } from '@/lib/contract/types'
import { FulfillmentPickPackBlock, type Pick, type PickLine } from './FulfillmentPickPackBlock'

const actionNamed = (name: string) => FulfillmentTaskMeta.actions.find(a => a.name === name) as ActionMeta
const done: Record<string, { title: string; description: string }> = {
  record_picks: { title: 'Picks saved', description: 'The buyer sees short lines on their order.' },
  pack: { title: 'Packed', description: 'Hand it over to the carrier with a photo next.' },
  hand_over: { title: 'Handed over', description: 'The order is shipped and the buyer can follow the delivery.' },
}

export function FulfilmentListPage() {
  const source = useSource(FulfillmentTaskMeta)
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={FulfillmentTaskMeta} title="Fulfilment"
        description="A pick list for every confirmed order, oldest first. Pick each line, pack, then hand over to the carrier with a photo; the order and your stock follow each step." />
      <ListBlock meta={FulfillmentTaskMeta} records={[]} query="server" source={source} narrow="collapse" href={r => `/sell/fulfilment/${r.id}`}
        empty={{ kind: 'no-data', title: 'Nothing to pick', description: 'A pick list appears here as soon as you confirm an order.' }} />
    </>
  )
}

const lineOf = (l: FulfillmentTaskRecord['lines'][number]): PickLine => ({
  id: l.id, bin: l.bin, product: l.product, packLabel: l.pack_label, sku: l.sku, ordered: l.ordered, unit: l.unit, onShelf: l.on_shelf, picked: l.picked, outcome: l.outcome, reason: l.reason,
})

export function FulfilmentTaskPage({ id }: { id: string }) {
  const record = useRecord<FulfillmentTaskRecord>(FulfillmentTaskMeta, id)
  const command = useCommand(FulfillmentTaskMeta, [OrderMeta, ShipmentMeta, InventoryBalanceMeta])
  const toast = useToast()
  const [error, setError] = useState<AppError | null>(null)
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the pick list" />
  if (record.isError || !record.data) return <ErrorState {...errorFrom(record.error)} title="The pick list did not load" onRetry={() => void record.refetch()} />
  const t = record.data
  const send = withUploads(command.run)
  const run = (name: string) => async (input: Record<string, unknown>) => {
    setError(null)
    try {
      await send(actionNamed(name), t, input)
      toast({ tone: 'success', ...done[name]! })
    } catch (err) {
      setError(err as AppError)
      throw err
    }
  }
  // A new set of saved picks starts the block afresh from what the server holds.
  const saved = t.lines.map(l => `${l.id}:${l.outcome}:${l.picked}`).join('|')
  return (
    <>
      <HeaderBlock level={1} source="record" meta={FulfillmentTaskMeta} record={t} title={`Pick list ${t.order_number}`}
        breadcrumbs={[{ label: 'Fulfilment', href: '/sell/fulfilment' }, { label: t.order_number }]}
        description={<>For {t.buyer}. <Link href={`/sell/orders/${t.order_id}` as Route} className="font-semibold text-primary hover:underline">Open the order</Link></>} />
      <div className="max-w-3xl">
        <FulfillmentPickPackBlock key={`${t.status}|${saved}`} order={t.order_number} status={t.status} lines={t.lines.map(lineOf)} buyer={t.buyer} deliverTo={t.deliver_to} instructions={t.instructions}
          evidence={t.handover_evidence ? { ...t.handover_evidence, state: 'ready' } : null} pending={command.pending} error={error}
          onRecordPicks={(picks: Pick[]) => run('record_picks')({ picks })} onPack={run('pack')} onHandOver={run('hand_over')} />
      </div>
    </>
  )
}
