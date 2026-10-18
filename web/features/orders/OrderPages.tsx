'use client'

// SM-F-20, buyers: order history and reorder. Orders are immutable snapshots; the reorder preview reads
// today's catalogue against each line and the reorder command copies what can be ordered into a fresh
// cart, then opens it. The order lifecycle (SM-F-15) adds placing and tracking orders later.

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ReorderDiffBlock, type ReorderLine } from '@/components/commerce/pricing'
import { stockFrom } from '@/components/commerce/types'
import { DetailBlock } from '@/components/kernel/blocks/DataBlocks'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { PageSection } from '@/components/layout/section'
import { TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { ApiError, api } from '@/lib/client/api'
import type { OrderRecord, ReorderDifference, ReorderResult } from '@/lib/client/records'
import { useRecord, useRefresh, useSource } from '@/lib/client/resources'
import { CartLineMeta, CartMeta, OrderMeta } from '@/lib/contract/generated'
import { formatMoney } from '@/lib/money'

const SUMMARY = ['order_number', 'status', 'submitted_at', 'submitted_by', 'delivery_address', 'special_instructions', 'total']

export function OrdersPage() {
  const source = useSource(OrderMeta)
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={OrderMeta} title="Orders" description="Everything your organization has ordered, newest first. Open an order to see its lines or copy it into a new cart." />
      <ListBlock meta={OrderMeta} records={[]} query="server" source={source} href={r => `/orders/${r.id}`}
        empty={{ kind: 'no-data', title: 'No orders yet', description: 'Orders appear here once your organization places them.' }} />
    </>
  )
}

export const reorderLine = (d: ReorderDifference): ReorderLine => ({
  id: d.line_id, product: d.product, unit: d.unit, thenQuantity: d.then.quantity, thenPrice: d.then.unit_price,
  nowQuantity: d.now?.quantity, nowPrice: d.now?.unit_price, stock: d.now ? stockFrom(d.now.stock) : undefined, kinds: d.kinds, addable: d.addable,
})

export function OrderPage({ id }: { id: string }) {
  const record = useRecord<OrderRecord>(OrderMeta, id)
  const refresh = useRefresh()
  const router = useRouter()
  const toast = useToast()
  const [copying, setCopying] = useState(false)
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the order" />
  if (record.isError || !record.data) return <ErrorState kind="retryable" title="The order did not load" onRetry={() => void record.refetch()} />
  const o = record.data
  const reorder = async () => {
    setCopying(true)
    try {
      const result = await api<ReorderResult>(`${OrderMeta.path}/${o.id}/reorder`, { method: 'POST', body: {} })
      await refresh(CartMeta.path!, CartLineMeta.path!, OrderMeta.path!)
      const left = result.unavailable_line_ids.length
      toast({ tone: left ? 'warning' : 'success', title: 'Copied to a new cart', description: left ? `${left} ${left === 1 ? 'line was' : 'lines were'} left out; the rest are at today’s prices.` : 'Every line is in your cart at today’s prices.' })
      router.push('/cart' as Route)
    } catch (err) {
      toast({ tone: 'danger', title: 'Not copied', description: err instanceof ApiError ? err.error.detail : 'Try again in a moment.', persistent: true })
    } finally {
      setCopying(false)
    }
  }
  return (
    <>
      <HeaderBlock level={1} source="record" meta={OrderMeta} record={o} title={o.order_number}
        breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: o.order_number }]}
        description={`From ${o.seller.label}. Prices and products below are as they were ordered; they never change.`} />
      {o.reorder ? (
        <ReorderDiffBlock orderReference={o.order_number} placedOn={o.submitted_at} lines={o.reorder.lines.map(reorderLine)}
          replacesCartLines={o.reorder.current_cart_lines} adding={copying} onAdd={() => void reorder()} />
      ) : null}
      <PageSection title="Lines" description="What was ordered, at the price agreed then.">
        <div className="overflow-x-auto border border-border bg-surface" data-density="compact">
          <Table caption={`Lines of ${o.order_number}`}>
            <THead><tr><Th>Product</Th><Th>Pack</Th><Th>SKU</Th><Th numeric>Quantity</Th><Th numeric>Price per pack</Th><Th numeric>Line total</Th></tr></THead>
            <TBody>
              {o.lines.map(l => (
                <Tr key={l.id}>
                  <Td className="font-medium">{l.product}</Td>
                  <Td>{l.pack_label}</Td>
                  <Td><code className="font-mono text-sm">{l.sku}</code></Td>
                  <Td numeric>{l.quantity}</Td>
                  <Td numeric className="whitespace-nowrap">{formatMoney(l.unit_price)}</Td>
                  <Td numeric className="whitespace-nowrap font-semibold">{formatMoney(l.line_total)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </PageSection>
      <PageSection title="Order">
        <DetailBlock meta={{ ...OrderMeta, fields: OrderMeta.fields.filter(f => SUMMARY.includes(f.name)) }} record={o} surface="flat" />
      </PageSection>
    </>
  )
}
