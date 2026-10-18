import type { Metadata } from 'next'
import { BuyersPage } from '@/features/buyers/BuyersPage'

export const metadata: Metadata = { title: 'Buyers and prices' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <BuyersPage />
}
