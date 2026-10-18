import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { SellerAnalytics } from '@/features/analytics/SellerAnalytics'

export const metadata: Metadata = { title: 'Analytics' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

// The chosen period lives in the URL (?range=90d), read on the client inside this boundary.
export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading analytics" />}>
      <SellerAnalytics />
    </Suspense>
  )
}
