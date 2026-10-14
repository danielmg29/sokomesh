import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { InventoryLedger } from '@/features/design-system/InventoryLedger'

export const metadata: Metadata = {
  title: 'Design system',
  description: 'Every SokoMesh component, field renderer, block and page template, live in every state.',
  robots: { index: false, follow: false },
}

export default function DesignSystemPage() {
  return (
    // useSearchParams (URL-backed filters and open rows) needs a Suspense boundary.
    <Suspense fallback={<div className="p-8"><LoadingState variant="skeleton" shape="list" rows={8} label="Loading component inventory" /></div>}>
      <InventoryLedger />
    </Suspense>
  )
}
