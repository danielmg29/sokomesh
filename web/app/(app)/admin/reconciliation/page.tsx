import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { ReconciliationPage } from '@/features/reconciliation/ReconciliationPages'

export const metadata: Metadata = { title: 'Reconciliation' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

// Reads its search parameters on the client.
export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="list" label="Loading the checks" />}>
      <ReconciliationPage />
    </Suspense>
  )
}
