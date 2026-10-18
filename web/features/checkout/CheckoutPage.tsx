'use client'

// SM-F-15 checkout: choose where to deliver, review each seller's part, place the orders. The API checks
// every line again (still on sale, minimum order, reported stock, today's price) and places one order per
// seller; orders over the organization's approval threshold wait for a colleague (SM-F-12). Payment is not
// taken here: sellers confirm delivery fees and terms on the order.

import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { CheckoutSummaryBlock, type CheckoutGroup } from '@/components/commerce/checkout'
import { orderLook } from '@/components/commerce/orders'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import type { AddressValue } from '@/components/kernel/fields/types'
import { buttonStyles } from '@/components/ui/button'
import { Stamp } from '@/components/ui/stamp'
import { ApiError, api } from '@/lib/client/api'
import type { CartRecord, CheckoutResult, OrderRecord } from '@/lib/client/records'
import { useList, useRefresh } from '@/lib/client/resources'
import { AddressMeta, ApprovalPolicyMeta, CartLineMeta, CartMeta, OrderMeta } from '@/lib/contract/generated'
import type { AppError, Rec } from '@/lib/contract/types'
import { compareMoney, formatMoney } from '@/lib/money'

type Step = 'address' | 'review' | 'result'
const STEPS = ['address', 'review', 'result'] as const
const field = (name: string) => CartMeta.fields.find(f => f.name === name)!
type AddressRecord = Rec & { label: string; line1: string; line2?: string; city: string; region?: string; postal_code?: string; country_code?: string }
type PolicyRecord = Rec & { name: string; threshold_amount: string; is_active: boolean }

const addressValue = (a: AddressRecord): AddressValue => ({ label: a.label, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postal_code, countryCode: a.country_code ?? 'KE' })

export function CheckoutPage() {
  const cartList = useList<CartRecord>(CartMeta, 'status__in=active&page_size=1')
  const addresses = useList<AddressRecord>(AddressMeta, 'page_size=50')
  const policies = useList<PolicyRecord>(ApprovalPolicyMeta, 'is_active__eq=true&page_size=20')
  const refresh = useRefresh()
  const [step, setStep] = useState<Step>('address')
  const [address, setAddress] = useState<{ id: string; label: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [placed, setPlaced] = useState<OrderRecord[] | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (cartList.isPending || addresses.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading checkout" />
  if (cartList.isError) return <ErrorState kind="retryable" title="Checkout did not load" onRetry={() => void cartList.refetch()} />
  const cart = cartList.data.results[0]
  const header = <HeaderBlock level={1} source="explicit" title="Checkout" breadcrumbs={[{ label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
    description="Each seller receives their own order. Prices and stock are checked again when you place them." />

  if (placed) {
    return (
      <>
        {header}
        <CheckoutSummaryBlock step="result" state="valid" steps={STEPS} groups={placed.map(o => ({ seller: o.seller.label, lines: o.lines?.length ?? 0, subtotal: o.total }))}>
          <section className="flex flex-col gap-4 border border-border bg-surface p-5" aria-label="Orders placed">
            <h2 className="font-display text-2xl font-bold">{placed.length === 1 ? 'Order placed' : `${placed.length} orders placed`}</h2>
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {placed.map(o => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="flex flex-col"><Link href={`/orders/${o.id}` as Route} className="font-semibold text-primary hover:underline">{o.order_number}</Link><span className="text-sm text-muted">{o.seller.label} · {formatMoney(o.total)}</span></span>
                  <Stamp tone={orderLook[o.status].tone} fresh>{orderLook[o.status].label}</Stamp>
                </li>
              ))}
            </ul>
            {placed.some(o => o.status === 'pending_approval') ? <p className="text-md">Orders awaiting approval reach the seller once a colleague approves them. They have been notified.</p> : <p className="text-md">The sellers have been notified. You will hear from them as each order is confirmed and shipped.</p>}
            <div className="flex flex-wrap gap-2"><Link href="/orders" className={buttonStyles({ variant: 'primary' })}>Your orders</Link><Link href="/catalogue" className={buttonStyles({ variant: 'secondary' })}>Keep shopping</Link></div>
          </section>
        </CheckoutSummaryBlock>
      </>
    )
  }
  if (!cart || !cart.line_count) {
    return (
      <>
        {header}
        <EmptyState kind="no-data" title="Nothing to check out" description="Your cart is empty. Add packs from any product page first."
          action={<Link href="/catalogue" className={buttonStyles({ variant: 'primary' })}>Browse the catalogue</Link>} />
      </>
    )
  }

  const options = (addresses.data?.results ?? []).map(a => ({ value: a.id, label: a.label, description: [a.line1, a.city].filter(Boolean).join(', ') }))
  const chosen = addresses.data?.results.find(a => a.id === address?.id)
  const groups: CheckoutGroup[] = cart.groups.map(g => ({ seller: g.seller.label, lines: g.lines.filter(l => l.state !== 'unavailable').length, subtotal: g.subtotal }))
  // A mirror of the server's rule, for warning only: the strictest active policy each seller's total reaches.
  const active = (policies.data?.results ?? []).filter(p => p.is_active)
  const needsApproval = (subtotal: string) => active.filter(p => compareMoney(subtotal, p.threshold_amount) >= 0).sort((a, b) => compareMoney(b.threshold_amount, a.threshold_amount))[0]
  const blocked = cart.state !== 'valid' ? (cart.state === 'repricing' ? 'Some prices changed. Accept the new prices in your cart first.' : 'Some lines are unavailable. Remove them in your cart first.')
    : step === 'address' && !address ? 'Choose where to deliver.' : undefined

  const place = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await api<CheckoutResult>(`${CartMeta.path}/${cart.id}/checkout`, { method: 'POST', body: { delivery_address: address?.id, special_instructions: notes } })
      await refresh(CartMeta.path!, CartLineMeta.path!, OrderMeta.path!)
      setPlaced(result.orders)
    } catch (err) {
      setError(err instanceof ApiError ? err.error : { code: 'UNAVAILABLE', detail: 'The orders were not placed. Try again in a moment.', fields: {}, retryable: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {header}
      <CheckoutSummaryBlock step={step} steps={STEPS} state={blocked ? 'blocked' : submitting ? 'submitting' : 'valid'} groups={groups} address={chosen ? addressValue(chosen) : undefined}
        blockedReason={blocked} continueLabel={step === 'address' ? 'Review the orders' : cart.groups.length > 1 ? `Place ${cart.groups.length} orders` : 'Place the order'}
        onContinue={() => (step === 'address' ? setStep('review') : void place())} onBack={() => setStep('address')}>
        {error ? (
          <div role="alert" className="flex flex-col gap-2 border border-tone-danger bg-tone-danger-bg/60 px-4 py-3 text-md">
            <span className="font-semibold">The orders were not placed.</span>
            <span>{error.detail}</span>
            {error.code === 'CONFLICT' ? <Link href="/cart" className="font-semibold text-primary hover:underline">Back to your cart</Link> : null}
          </div>
        ) : null}
        {step === 'address' ? (
          <section className="flex flex-col gap-5 border border-border bg-surface p-5" aria-label="Delivery">
            <h2 className="font-display text-xl font-bold">Where should the orders go?</h2>
            {options.length ? (
              <FieldInput field={field('delivery_address')} value={address} options={options} error={error?.fields.delivery_address?.[0]} onChange={v => setAddress((v as { id: string; label: string } | null) ?? null)} />
            ) : (
              <p className="text-md">Your organization has no addresses yet. <Link href={'/organization?tab=addresses' as Route} className="font-semibold text-primary hover:underline">Add one</Link>, then come back.</p>
            )}
            <FieldInput field={field('special_instructions')} value={notes} error={error?.fields.special_instructions?.[0]} onChange={v => setNotes(String(v ?? ''))} />
          </section>
        ) : (
          <section className="flex flex-col gap-4" aria-label="Review">
            {cart.groups.map(g => {
              const policy = needsApproval(g.subtotal)
              return (
                <article key={g.seller.id} className="flex flex-col border border-border bg-surface">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <span className="font-display text-lg font-bold">{g.seller.label}</span>
                    {policy ? <Stamp tone="warning" size="sm" detail={`${policy.name}: ${formatMoney(policy.threshold_amount)} or more`}>Needs approval</Stamp> : <Stamp tone="info" size="sm">Goes straight to the seller</Stamp>}
                  </header>
                  <ul className="flex flex-col divide-y divide-border">
                    {g.lines.filter(l => l.state !== 'unavailable').map(l => (
                      <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-md">
                        <span><b className="font-semibold tabular">{l.quantity}</b> × {l.product.name} <span className="text-muted">· {l.variant.pack_label}</span></span>
                        <span className="tabular">{formatMoney(l.unit_price)} <span className="text-sm text-muted">{l.price_explanation !== 'List price' ? `· ${l.price_explanation}` : ''}</span></span>
                      </li>
                    ))}
                  </ul>
                  <footer className="flex justify-between border-t border-border px-4 py-3 text-md"><span className="text-muted">Order total</span><span className="font-semibold tabular">{formatMoney(g.subtotal)}</span></footer>
                </article>
              )
            })}
            {notes ? <p className="text-md text-muted">Instructions for every seller: “{notes}”</p> : null}
          </section>
        )}
      </CheckoutSummaryBlock>
    </>
  )
}
