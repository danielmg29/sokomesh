'use client'

// The product page's buying column (SM-F-10): choose a pack, choose how many, add it to the server-backed
// cart. The stepper mirrors the API's rules (minimum order, reported stock) for quick feedback; the API
// decides, and its message is shown in place when it refuses. Who may buy comes from the session.

import { Minus, Plus, ShoppingCart } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { Button, IconButton, buttonStyles } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { ApiError, api } from '@/lib/client/api'
import type { VariantRecord } from '@/lib/client/records'
import { useRefresh } from '@/lib/client/resources'
import { activeMembership, may, useSession } from '@/lib/client/session'
import { CartLineMeta, CartMeta } from '@/lib/contract/generated'
import { formatMoney, multiplyMoney } from '@/lib/money'
import { StockAvailabilityIndicator } from './stock'
import { stockFrom } from './types'

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-KE')} ${n === 1 ? one : many}`

/** Whether the signed-in person can buy, and if not, what they would need to do. */
function useBuyer(): { can: true } | { can: false; reason: string; href?: Route; cta?: string } {
  const { data, isPending } = useSession()
  if (isPending) return { can: false, reason: '' }
  if (!data?.user) return { can: false, reason: 'Sign in with a buyer account to order.', href: '/login', cta: 'Sign in to order' }
  const org = activeMembership(data)?.organization
  if (!org || org.organization_type !== 'buyer') return { can: false, reason: 'Switch to a buyer organization to order; sellers and administrators do not buy here.' }
  if (org.approval_state !== 'approved') return { can: false, reason: `${org.name} is waiting for marketplace approval before it can order.` }
  if (!may(data, 'cart_line.create')) return { can: false, reason: 'Your role cannot add to the cart.' }
  return { can: true }
}

/** Add one variant to the cart: a quantity stepper from its minimum order, and the add button. */
export function AddToCart({ variant, productName, compact = false }: { variant: VariantRecord; productName: string; compact?: boolean }) {
  const buyer = useBuyer()
  const toast = useToast()
  const refresh = useRefresh()
  const [quantity, setQuantity] = useState(variant.moq)
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const max = variant.stock.available ?? Number.POSITIVE_INFINITY
  const out = variant.stock.state === 'unavailable'
  const clamp = (n: number) => Math.min(Math.max(variant.moq, Math.floor(n) || variant.moq), Number.isFinite(max) ? max : n)
  const add = async () => {
    setPending(true)
    setProblem(null)
    try {
      await api(CartLineMeta.path!, { method: 'POST', body: { variant: variant.id, quantity } })
      await refresh(CartMeta.path!, CartLineMeta.path!)
      toast({ tone: 'success', title: 'Added to your cart', description: `${plural(quantity, 'pack')} of ${productName}, ${variant.pack_label}.` })
    } catch (err) {
      const e = err instanceof ApiError ? err.error : null
      setProblem(e?.fields?.quantity?.[0] ?? e?.fields?.variant?.[0] ?? e?.detail ?? 'It was not added. Try again in a moment.')
    } finally {
      setPending(false)
    }
  }
  if (!buyer.can) {
    if (!buyer.reason) return <div className="h-12" aria-hidden />
    return (
      <div className="flex flex-col gap-2">
        <p className="text-md text-muted">{buyer.reason}</p>
        {buyer.href ? <Link href={buyer.href} className={buttonStyles({ variant: 'primary', size: compact ? 'md' : 'lg', block: true })}>{buyer.cta}</Link> : null}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <div className={cn('flex flex-wrap items-center gap-3', compact && 'gap-2')}>
        <div className="flex items-center gap-1" role="group" aria-label={`Packs of ${productName}`}>
          <IconButton icon={Minus} label="One pack fewer" size={compact ? 'icon-sm' : 'icon'} variant="secondary" disabled={out || quantity <= variant.moq} onClick={() => setQuantity(q => clamp(q - 1))} />
          <input
            aria-label="Packs"
            inputMode="numeric"
            value={quantity}
            disabled={out}
            onChange={e => setQuantity(Number(e.target.value.replace(/\D/g, '')) || 0)}
            onBlur={() => setQuantity(q => clamp(q))}
            className={cn('h-10 w-16 border border-border-strong bg-surface text-center font-semibold tabular', compact && 'h-8 w-14')}
          />
          <IconButton icon={Plus} label="One pack more" size={compact ? 'icon-sm' : 'icon'} variant="secondary" disabled={out || quantity >= max} onClick={() => setQuantity(q => clamp(q + 1))} />
        </div>
        {!compact ? <span className="text-md text-muted tabular">{formatMoney(multiplyMoney(variant.unit_price, quantity))}</span> : null}
      </div>
      <Button variant="primary" size={compact ? 'md' : 'lg'} block leadingIcon={ShoppingCart} disabled={out || quantity < variant.moq} loading={pending} loadingLabel="Adding…" onClick={() => void add()}>
        {out ? 'Out of stock' : 'Add to cart'}
      </Button>
      {problem ? <p role="alert" className="text-sm font-medium text-tone-danger">{problem}</p> : null}
      {!compact ? <Link href="/cart" className="inline-flex items-center gap-1.5 self-start text-md font-semibold text-primary hover:underline"><Icon icon={ShoppingCart} />View your cart</Link> : null}
    </div>
  )
}

/**
 * The buying column: each sellable pack with its price, price per normalised unit, minimum order and
 * stock; the chosen one goes to the cart. One pack is shown plainly; several are a choice.
 */
export function BuyBox({ variants, productName }: { variants: readonly VariantRecord[]; productName: string }) {
  const [chosen, setChosen] = useState(variants[0]?.id)
  const variant = variants.find(v => v.id === chosen) ?? variants[0]
  if (!variant) return <p className="text-md text-muted">This product has no packs on sale right now.</p>
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{variants.length > 1 ? `Choose a pack (${variants.length})` : 'Pack'}</legend>
        {variants.map(v => {
          const on = v.id === variant.id
          return (
            <label key={v.id} className={cn('grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 border px-3 py-3 motion-reveal transition-colors', on ? 'border-foreground bg-surface' : 'border-border hover:border-border-strong', variants.length === 1 && 'cursor-default')}>
              <input type="radio" name="variant" value={v.id} checked={on} onChange={() => setChosen(v.id)} className={cn('mt-1 accent-primary', variants.length === 1 && 'sr-only')} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold">{v.pack_label}</span>
                <span className="text-sm text-muted">SKU <code className="font-mono">{v.sku}</code> · from {plural(v.moq, 'pack')}</span>
                <span className="pt-1"><StockAvailabilityIndicator stock={stockFrom(v.stock)} /></span>
              </span>
              <span className="flex flex-col items-end text-right">
                <span className="font-display text-xl font-bold tabular">{formatMoney(v.unit_price)}</span>
                {v.normalised_price ? <span className="text-sm text-muted tabular">{formatMoney(v.normalised_price.amount)} / {v.normalised_price.per}</span> : null}
              </span>
            </label>
          )
        })}
      </fieldset>
      <AddToCart key={variant.id} variant={variant} productName={productName} />
    </div>
  )
}
