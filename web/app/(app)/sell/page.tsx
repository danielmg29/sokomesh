import type { Metadata } from 'next'
import { SellerApplication } from '@/features/sellers/SellerApplication'

export const metadata: Metadata = { title: 'Selling' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <SellerApplication />
}
