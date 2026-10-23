'use client'

// SM-F-10, buyers: the server-backed cart grouped by seller. Every change goes to the API, which checks
// minimum orders, stock and whether a product is still on sale; repricing waits for the buyer to accept it.
// From here a buyer checks out (SM-F-15; orders over the approval threshold wait for a colleague, SM-F-12)
// or asks one seller for a quote on that seller's lines (SM-F-11), which moves those lines into the quote.

import { FileQuestion } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CartBlock, QuoteRequestSheet, groupSubtotal, type CartState, type QuoteOutcome } from '@/components/commerce/cart'
import { stockFrom } from '@/components/commerce/types'
import type { CartLine, SellerGroup } from '@/components/commerce/types'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { Button, buttonStyles } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/client/api'
import type { CartLineRecord, CartRecord, QuoteRecord } from '@/lib/client/records'
import { useCommand, useList, useSave } from '@/lib/client/resources'
import { policyFor, type PolicyLike } from '@/lib/client/approval'
import { activeMembership, may, useSession } from '@/lib/client/session'
import { AddressMeta, ApprovalPolicyMeta, CartLineMeta, CartMeta, QuoteMeta } from '@/lib/contract/generated'
import type { ActionMeta, Rec } from '@/lib/contract/types'

const ACTIVE = 'status__in=active&page_size=1'
const QUOTE_FIELDS = ['delivery_address', 'expires_at', 'buyer_notes']
const quoteFields = QuoteMeta.fields.filter(f => QUOTE_FIELDS.includes(f.name))
type AddressRecord = Rec & { label: string; line1: string; city: string }
type PolicyRecord = Rec & PolicyLike

function lineOf(l: CartLineRecord): CartLine {
  return {
    id: l.id, product: l.product.name, variant: l.variant.pack_label, sku: l.variant.sku, image: l.product.image ?? undefined,
    quantity: l.quantity, unit: l.unit, unitPrice: l.unit_price, previousUnitPrice: l.state === 'changed' ? l.quoted_unit_price : undefined,
    moq: l.variant.moq, step: 1, stock: stockFrom(l.stock), state: l.state, reason: l.reason ?? undefined,
    priceNote: l.price_explanation && l.price_explanation !== 'List price' ? l.price_explanation : undefined,
  }
}

/** Three working days from now at 17:00 East Africa Time, a fair default for a seller to respond by. */
function defaultExpiry(): string {
  const d = new Date(Date.now() + 3 * 86_400_000)
  return `${d.toISOString().slice(0, 10)}T17:00:00+03:00`
}

function QuoteRequest({ group, addresses }: { group: SellerGroup; addresses: AddressRecord[] }) {
  const save = useSave<QuoteRecord>(QuoteMeta, [CartMeta, CartLineMeta])
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const first = addresses[0]
  const submit = async (values: Record<string, unknown>): Promise<QuoteOutcome> => {
    const address = values.delivery_address as { id: string } | string | null
    try {
      const made = await save.mutateAsync({ body: { seller_organization: group.sellerId, delivery_address: typeof address === 'string' ? address : address?.id, expires_at: values.expires_at, buyer_notes: values.buyer_notes ?? '' } })
      setOpen(false)
      toast({ tone: 'success', title: `Quote ${made.reference} sent`, description: `${group.seller} has until the date you chose to respond. The lines wait in the quote.` })
      router.push(`/quotes/${made.id}` as Route)
      return { ok: true }
    } catch (err) {
      if (err instanceof ApiError) return { ok: false, error: err.error }
      throw err
    }
  }
  return (
    <QuoteRequestSheet mode="create" status="draft" seller={group.seller} open={open} onOpenChange={setOpen}
      lines={group.lines.filter(l => l.state !== 'unavailable').map(l => ({ id: l.id, product: l.product, quantity: l.quantity, unit: l.unit, listPrice: l.unitPrice }))}
      fields={quoteFields} options={{ delivery_address: addresses.map(a => ({ value: a.id, label: a.label, description: [a.line1, a.city].filter(Boolean).join(', ') })) }}
      initial={{ delivery_address: first ? { id: first.id, label: first.label } : null, expires_at: defaultExpiry(), buyer_notes: '' }}
      trigger={<Button size="sm" variant="secondary" leadingIcon={FileQuestion}>Ask {group.seller} for a quote</Button>} onSubmit={submit} />
  )
}

export function CartPage() {
  const list = useList<CartRecord>(CartMeta, ACTIVE)
  const { data: session } = useSession()
  const canQuote = may(session, 'quote.create')
  const addresses = useList<AddressRecord>(AddressMeta, 'page_size=50', canQuote)
  const policies = useList<PolicyRecord>(ApprovalPolicyMeta, 'is_active__eq=true&page_size=20', may(session, 'approval_policy.list'))
  const cartCommand = useCommand(CartMeta, [CartLineMeta])
  const lineCommand = useCommand(CartLineMeta, [CartMeta])
  const save = useSave(CartLineMeta, [CartMeta])
  const router = useRouter()
  const toast = useToast()
  const [accepting, setAccepting] = useState(false)
  if (list.isPending) return <LoadingState variant="skeleton" shape="list" rows={4} label="Loading your cart" />
  if (list.isError) return <ErrorState {...errorFrom(list.error)} title="Your cart did not load" onRetry={() => void list.refetch()} />
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
  // A mirror of the server's approval rule, for the banner only (lib/client/approval.ts): a seller's part that
  // would wait for approval, unless this person's role lets their own orders through.
  const role = activeMembership(session)?.role_key
  const reached = groups.map(g => policyFor(policies.data?.results ?? [], role, groupSubtotal(g))).find(Boolean)?.threshold_amount
  const state: CartState = cart.state === 'valid' && reached ? 'approval-needed' : cart.state
  const checkout = () => router.push('/checkout' as Route)
  const usable = addresses.data?.results ?? []
  return (
    <>
      {header}
      <CartBlock
        groups={groups}
        state={state}
        approvalThreshold={reached}
        accepting={accepting}
        onCheckout={checkout}
        onRequestApproval={checkout}
        groupActions={canQuote ? g => (usable.length ? <QuoteRequest group={g} addresses={usable} /> : null) : undefined}
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
