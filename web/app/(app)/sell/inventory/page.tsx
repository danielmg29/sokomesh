import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { InventoryPage } from '@/features/inventory/InventoryPage'

export const metadata: Metadata = { title: 'Stock' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

// Reads its search parameters on the client.
export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="list" label="Loading your stock" />}>
      <InventoryPage />
    </Suspense>
  )
}
