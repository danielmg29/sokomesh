import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { AdminSellerReview } from '@/features/marketplace/AdminPages'

export const metadata: Metadata = { title: 'Seller review' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

async function Review({ params }: { params: PageProps<'/admin/sellers/[id]'>['params'] }) {
  const { id } = await params
  return <AdminSellerReview id={id} />
}

export default function Page({ params }: PageProps<'/admin/sellers/[id]'>) {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading the application" />}>
      <Review params={params} />
    </Suspense>
  )
}
