import type { Metadata } from 'next'
import { CheckoutPage } from '@/features/checkout/CheckoutPage'

export const metadata: Metadata = { title: 'Checkout' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <CheckoutPage />
}
