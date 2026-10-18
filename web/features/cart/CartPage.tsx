'use client'

// SM-F-10, buyers: the server-backed cart grouped by seller. Every change goes to the API, which checks
// minimum orders, stock and whether a product is still on sale; repricing waits for the buyer to accept it.
// Checkout is the order lifecycle's (SM-F-15), so the cart says plainly that it is not open yet.

import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { CartBlock } from '@/components/commerce/cart'
import { stockFrom } from '@/components/commerce/types'
import type { CartLine, SellerGroup } from '@/components/commerce/types'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { buttonStyles } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/client/api'
import type { CartLineRecord, CartRecord } from '@/lib/client/records'
import { useCommand, useList, useSave } from '@/lib/client/resources'
import { CartLineMeta, CartMeta } from '@/lib/contract/generated'
import type { ActionMeta, Rec } from '@/lib/contract/types'

const ACTIVE = 'status__in=active&page_size=1'
const CHECKOUT_LATER = 'Placing orders opens with the order lifecycle. Your cart is kept on your account, and prices are checked again when you order.'

function lineOf(l: CartLineRecord): CartLine {
  return {
    id: l.id, product: l.product.name, variant: l.variant.pack_label, sku: l.variant.sku, image: l.product.image ?? undefined,
    quantity: l.quantity, unit: l.unit, unitPrice: l.unit_price, previousUnitPrice: l.state === 'changed' ? l.quoted_unit_price : undefined,
    moq: l.variant.moq, step: 1, stock: stockFrom(l.stock), state: l.state, reason: l.reason ?? undefined,
  }
}

export function CartPage() {
  const list = useList<CartRecord>(CartMeta, ACTIVE)
  const cartCommand = useCommand(CartMeta, [CartLineMeta])
  const lineCommand = useCommand(CartLineMeta, [CartMeta])
  const save = useSave(CartLineMeta, [CartMeta])
  const toast = useToast()
  const [accepting, setAccepting] = useState(false)
  if (list.isPending) return <LoadingState variant="skeleton" shape="list" rows={4} label="Loading your cart" />
  if (list.isError) return <ErrorState kind="retryable" title="Your cart did not load" onRetry={() => void list.refetch()} />
  const cart = list.data.results[0]
  const fail = (title: string) => (err: unknown) => {
    const e = err instanceof ApiError ? err.error : (err as { detail?: string; fields?: Record<string, string[]> } | null)
    toast({ tone: 'danger', title, description: Object.values(e?.fields ?? {}).flat()[0] ?? e?.detail ?? 'Try again in a moment.', persistent: true })
  }
  const header = (
    <HeaderBlock level={1} source="explicit" title="Cart" description="Grouped by seller: each seller confirms and delivers their own part. Minimum orders and stock are checked every time the cart changes."
      actions={cart?.line_count ? <ActionBar meta={CartMeta} record={cart} onRun={cartCommand.run} pending={cartCommand.pending} inline={0} /> : null} />
  )
  if (!cart || !cart.line_count) {
    return (
      <>
        {header}
        <EmptyState kind="no-data" title="Your cart is empty" description="Add packs from any product page, or copy a past order from your order history."
          action={<div className="flex flex-wrap gap-2"><Link href="/catalogue" className={buttonStyles({ variant: 'primary' })}>Browse the catalogue</Link><Link href={'/orders' as Route} className={buttonStyles({ variant: 'secondary' })}>Your orders</Link></div>} />
      </>
    )
  }
  const groups: SellerGroup[] = cart.groups.map(g => ({ sellerId: g.seller.id, seller: g.seller.label, location: g.seller.city ?? 'Kenya', lines: g.lines.map(lineOf) }))
  const remove = CartLineMeta.actions.find(a => a.name === 'remove') as ActionMeta
  const accept = CartMeta.actions.find(a => a.name === 'accept_prices') as ActionMeta
  return (
    <>
      {header}
      <CartBlock
        groups={groups}
        state={cart.state}
        checkoutBlockedReason={CHECKOUT_LATER}
        accepting={accepting}
        onAcceptPrices={() => {
          setAccepting(true)
          cartCommand.run(accept, cart).then(() => toast({ tone: 'success', title: 'New prices accepted', description: 'Your cart now quotes today’s prices.' }), fail('Prices not accepted')).finally(() => setAccepting(false))
        }}
        onQuantity={(id, quantity) => void save.mutateAsync({ ref: id, body: { quantity } }).catch(fail('Quantity not changed'))}
        onRemove={id => void lineCommand.run(remove, { id } as Rec).catch(fail('Line not removed'))}
      />
    </>
  )
}
