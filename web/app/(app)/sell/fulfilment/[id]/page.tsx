import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { FulfilmentTaskPage } from '@/features/fulfillment/FulfilmentPages'

export const metadata: Metadata = { title: 'Pick list' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

async function Detail({ params }: { params: PageProps<'/sell/fulfilment/[id]'>['params'] }) {
  const { id } = await params
  return <FulfilmentTaskPage id={id} />
}

export default function Page({ params }: PageProps<'/sell/fulfilment/[id]'>) {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading the pick list" />}>
      <Detail params={params} />
    </Suspense>
  )
}
