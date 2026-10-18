import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { OrganizationPage } from '@/features/organizations/OrganizationPage'

export const metadata: Metadata = { title: 'Organization' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

// The open tab lives in the URL (?tab=team), read on the client inside this boundary.
export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading your organization" />}>
      <OrganizationPage />
    </Suspense>
  )
}
