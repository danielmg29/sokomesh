'use client'

// The public header's account corner: the calls to action for visitors, the way back into the app for
// someone signed in, and the cart for buyers. Server-rendered as the visitor version; the session
// replaces it once known.

import { ArrowRight, ShoppingCart } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { Avatar, Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { cta } from '@/features/marketing/Marketing'
import type { CartRecord } from '@/lib/client/records'
import { useList } from '@/lib/client/resources'
import { activeMembership, homeFor, may, useSession, type Session } from '@/lib/client/session'
import { CartMeta } from '@/lib/contract/generated'

/** The buyer's cart in the header, with how many lines it holds. */
function CartLink({ session }: { session: Session }) {
  const buyer = activeMembership(session)?.organization.organization_type === 'buyer' && may(session, 'cart.get')
  const cart = useList<CartRecord>(CartMeta, 'status__in=active&page_size=1', buyer)
  if (!buyer) return null
  const lines = cart.data?.results[0]?.line_count ?? 0
  return (
    <Link href={'/cart' as Route} className={buttonStyles({ variant: 'ghost', size: 'md' })} aria-label={lines ? `Cart, ${lines} ${lines === 1 ? 'line' : 'lines'}` : 'Cart'}>
      <Icon icon={ShoppingCart} />Cart{lines ? <Badge emphasis="signal">{lines}</Badge> : null}
    </Link>
  )
}

export function StorefrontAccount() {
  const { data } = useSession()
  const user = data?.user
  if (data && user) {
    return (
      <>
        {user.email_verified ? <CartLink session={data} /> : null}
        <Link href={homeFor(data)} className={buttonStyles({ variant: 'secondary', size: 'md' })}>
          <Avatar size="sm" name={user.display_name || user.email} src={user.avatar?.url} darkSrc={user.avatar?.dark_url} />
          {user.email_verified ? 'Your account' : 'Confirm your email'}<Icon icon={ArrowRight} />
        </Link>
      </>
    )
  }
  return (
    <>
      <Link href="/login" className={buttonStyles({ variant: 'ghost', size: 'md' })}>Sign in</Link>
      <a href={cta.sell.href} className={buttonStyles({ variant: 'secondary', size: 'md' })}>{cta.sell.label}</a>
      <a href={cta.buy.href} className={buttonStyles({ variant: 'primary', size: 'md' })}>{cta.buy.label}</a>
    </>
  )
}
