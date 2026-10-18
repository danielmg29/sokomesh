import type { Metadata } from 'next'
import { CartPage } from '@/features/cart/CartPage'

export const metadata: Metadata = { title: 'Cart' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <CartPage />
}
