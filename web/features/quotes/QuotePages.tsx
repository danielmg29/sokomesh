'use client'

// SM-F-11 quotes for both sides. A buyer asks one seller to price the lines from their cart (the cart page
// starts it); the seller offers prices per line or declines; the buyer accepts, which places the order at
// the offered prices, or declines. Open quotes past their validity read as expired. Which commands appear
// is the API's (`_can`); the seller's response has its own panel.

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { QuoteDecisionPanel, type QuoteDecision, type QuoteLineView } from '@/components/commerce/cart'
import { ActionBar, type RunAction } from '@/components/kernel/actions/ActionBar'
import { DetailBlock } from '@/components/kernel/blocks/DataBlocks'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { PageSection } from '@/components/layout/section'
import { DensityRegion } from '@/components/layout/primitives'
import { buttonStyles } from '@/components/ui/button'
import { TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { ApiError, api } from '@/lib/client/api'
import type { QuoteRecord } from '@/lib/client/records'
import { useCommand, useRecord, useRefresh, useSource } from '@/lib/client/resources'
import { CartLineMeta, CartMeta, OrderMeta, QuoteMeta } from '@/lib/contract/generated'
import type { ActionMeta, AppError, ModelMeta } from '@/lib/contract/types'
import { formatMoney } from '@/lib/money'

type Side = 'buyer' | 'seller'
const SUMMARY = ['reference', 'status', 'expires_at', 'delivery_address', 'requested_by', 'buyer_notes', 'seller_notes', 'responded_at', 'accepted_at', 'created_at']
// The seller answers through the decision panel; the header's action bar offers the buyer's commands.
const buyerMeta: ModelMeta = { ...QuoteMeta, actions: QuoteMeta.actions.filter(a => !['respond', 'decline'].includes(a.name)) }
const actionNamed = (name: string) => QuoteMeta.actions.find(a => a.name === name) as ActionMeta
const quoteHref = (side: Side, id: string) => (side === 'seller' ? `/sell/quotes/${id}` : `/quotes/${id}`)

export function QuotesPage({ side }: { side: Side }) {
  const source = useSource(QuoteMeta)
  const meta: ModelMeta = { ...QuoteMeta, list: { ...QuoteMeta.list, fields: QuoteMeta.list.fields.filter(f => f !== (side === 'seller' ? 'seller_organization' : 'buyer_organization')) } }
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={QuoteMeta} title="Quotes"
        description={side === 'seller'
          ? 'Buyers asking you to price their orders. Offer a price per line before the quote expires, or decline with a reason.'
          : 'Prices you asked sellers for. Accept an offer to place the order at those prices; ask for a new quote from your cart.'}
        actions={side === 'buyer' ? <Link href="/cart" className={buttonStyles({ variant: 'secondary' })}>Ask from your cart</Link> : null} />
      <ListBlock meta={meta} records={[]} query="server" source={source} narrow="collapse" href={r => quoteHref(side, r.id)}
        empty={side === 'seller'
          ? { kind: 'no-data', title: 'No quote requests', description: 'When a buyer asks you to price their cart, the request appears here.' }
          : { kind: 'no-data', title: 'No quotes yet', description: 'In your cart, ask a seller for a quote on their lines; the lines wait here until you accept or decline.' }} />
    </>
  )
}

const linesOf = (q: QuoteRecord): QuoteLineView[] => q.lines.map(l => ({ id: l.id, product: `${l.product} · ${l.pack_label}`, quantity: l.quantity, unit: l.unit, listPrice: l.list_price, offeredPrice: l.offered_price ?? undefined }))

function SellerResponse({ quote }: { quote: QuoteRecord }) {
  const command = useCommand(QuoteMeta)
  const toast = useToast()
  const [pending, setPending] = useState<QuoteDecision | null>(null)
  const [error, setError] = useState<string>()
  const decide = (decision: QuoteDecision, offers: Record<string, string>, notes: string) => {
    setPending(decision)
    setError(undefined)
    const run = decision === 'decline'
      ? command.run(actionNamed('decline'), quote, { seller_notes: notes })
      : command.run(actionNamed('respond'), quote, { offers, seller_notes: notes })
    run.then(() => toast({ tone: 'success', title: decision === 'decline' ? 'Quote declined' : 'Offer sent', description: `${quote.buyer.label} has been told.` }))
      .catch((err: AppError) => setError(Object.values(err.fields ?? {}).flat()[0] ?? err.detail))
      .finally(() => setPending(null))
  }
  return <QuoteDecisionPanel key={quote.version} reference={quote.reference} buyer={quote.buyer.label} lines={linesOf(quote)} expiresAt={quote.expires_at}
    notesField={QuoteMeta.fields.find(f => f.name === 'seller_notes')} onDecide={decide} pending={pending} error={error} />
}

export function QuotePage({ id }: { id: string }) {
  const record = useRecord<QuoteRecord>(QuoteMeta, id)
  const command = useCommand(QuoteMeta, [CartMeta, CartLineMeta])
  const refresh = useRefresh()
  const router = useRouter()
  const toast = useToast()
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the quote" />
  if (record.isError || !record.data) return <ErrorState {...errorFrom(record.error)} title="The quote did not load" onRetry={() => void record.refetch()} />
  const q = record.data
  const side: Side = q.side === 'seller' ? 'seller' : 'buyer'
  // Accepting answers with the order it placed, so the buyer goes straight to it.
  const run: RunAction = async (action, rec, input) => {
    if (action.name !== 'accept') return command.run(action, rec, input)
    try {
      const done = await api<QuoteRecord>(`${QuoteMeta.path}/${q.id}/accept`, { method: 'POST', body: {} })
      await refresh(QuoteMeta.path!, OrderMeta.path!)
      toast({ tone: 'success', title: `Order ${done.order?.order_number ?? ''} placed`, description: `At the prices ${q.seller.label} offered.` })
      if (done.order) router.push(`/orders/${done.order.id}` as Route)
    } catch (err) {
      throw err instanceof ApiError ? err.error : err
    }
  }
  const open = q.status === 'requested' || q.status === 'responded'
  return (
    <>
      <HeaderBlock level={1} source="record" meta={QuoteMeta} record={q} title={q.reference}
        breadcrumbs={[{ label: 'Quotes', href: side === 'seller' ? '/sell/quotes' : '/quotes' }, { label: q.reference }]}
        description={side === 'seller' ? `Requested by ${q.buyer.label}.` : `Asked of ${q.seller.label}.`}
        actions={side === 'buyer' ? <ActionBar meta={buyerMeta} record={q} onRun={run} pending={command.pending} /> : null} />
      {side === 'seller' && open && (q._can ?? []).includes('respond') ? <SellerResponse quote={q} /> : null}
      {q.status === 'accepted' ? (
        <QuoteDecisionPanel reference={q.reference} buyer={q.buyer.label} lines={linesOf(q)} expiresAt={q.expires_at} accepted={{ at: q.accepted_at ?? q.expires_at, total: q.offered_total }} />
      ) : (
        <PageSection title="Lines" description={q.status === 'responded' ? 'The seller’s offer per pack, against the list price when the quote was asked.' : 'List prices when the quote was asked; the seller offers their own.'}>
          <DensityRegion density="compact" className="overflow-x-auto border border-border bg-surface">
            <Table caption={`Lines of ${q.reference}`}>
              <THead><tr><Th>Product</Th><Th>SKU</Th><Th numeric>Quantity</Th><Th numeric>List price</Th><Th numeric>Offer</Th></tr></THead>
              <TBody>
                {q.lines.map(l => (
                  <Tr key={l.id}>
                    <Td className="font-medium">{l.product}<span className="block text-sm text-muted">{l.pack_label}</span></Td>
                    <Td><code className="font-mono text-sm">{l.sku}</code></Td>
                    <Td numeric>{l.quantity}</Td>
                    <Td numeric className="whitespace-nowrap">{formatMoney(l.list_price)}</Td>
                    <Td numeric className="whitespace-nowrap font-semibold">{l.offered_price ? formatMoney(l.offered_price) : <span className="font-normal text-muted">Not yet</span>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </DensityRegion>
          <p className="mt-3 flex flex-wrap justify-end gap-x-6 text-md"><span className="text-muted">List total {formatMoney(q.list_total)}</span>{q.status === 'responded' ? <span className="font-semibold">Offered {formatMoney(q.offered_total)}</span> : null}</p>
        </PageSection>
      )}
      {q.order ? <p className="text-md">Placed as order <Link href={(side === 'seller' ? `/sell/orders/${q.order.id}` : `/orders/${q.order.id}`) as Route} className="font-semibold text-primary hover:underline">{q.order.order_number}</Link>.</p> : null}
      <PageSection title="Quote">
        <DetailBlock meta={{ ...QuoteMeta, fields: QuoteMeta.fields.filter(f => SUMMARY.includes(f.name)) }} record={q} surface="flat" />
      </PageSection>
    </>
  )
}
