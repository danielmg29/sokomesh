import type { Metadata } from 'next'
import { SellerProducts } from '@/features/catalog/SellerCatalog'

export const metadata: Metadata = { title: 'Products' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <SellerProducts />
}
